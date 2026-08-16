import type { Slide, TextStyle } from "../../types";
import { uid } from "../id";
import { analyzeLines } from "../lists";
import {
  createSlideTextBox,
  SERMON_BODY_FRAME,
  SERMON_TITLE_FRAME,
} from "../slideTextBox";

/**
 * Sermon layout: a message is prose, not lyrics, so it is built the way an
 * article reads. Paragraphs stay whole instead of being cut into one line per
 * sentence, points keep their heading, and the topic, the text it is preached
 * from and the preacher's name open the deck on a title slide.
 *
 * Every slide carries its words in a text box rather than in the slide's own
 * lines, so a message can be laid out the way a presentation is: the block is
 * dragged and resized to leave room for whatever else the slide needs, and more
 * boxes can be added beside it.
 */

/** Body text size, in the container-query units the canvas paints in. */
const BODY_SIZE = 3.1;
const HEADING_SIZE = 4.3;
const TITLE_SIZE = 6.2;
const CREDIT_SIZE = 3.4;
const BODY_LINE_HEIGHT = 1.5;
/** Characters that fit on one rendered line at the body size. */
const CHARS_PER_LINE = 58;
/** Blank spacer between two blocks on the same slide, in body lines. */
const BLOCK_GAP_WEIGHT = 0.8;
const MIN_SLIDE_WEIGHT = 3;
const LABEL_MAX_CHARS = 32;

const HORIZONTAL_RULE = /^\s*([-*_])\s*(?:\1\s*){2,}$/;
const BLOCK_QUOTE = /^\s*>\s?/;

const MARKDOWN_HEADING = /^#{1,6}\s+(.+?)\s*#*$/;
const EMPHASIS_HEADING = /^(?:\*\*|__)(.+?)(?:\*\*|__)$/;
const TRAILING_COLON = /^(.{2,60}?)\s*:$/;
const ENUMERATED_HEADING = /^\(?(?:\d{1,2}|[ivxlcdm]{1,6})\s*[.)]\s+(.+)$/i;
const NAMED_HEADING =
  /^(?:introduction|intro|conclusion|conclusions|illustration|application|point|part|section|main\s+point|key\s+point|sub-?point|summary|prayer|closing|opening|background|context|observation|explanation|outline|invitation|altar\s+call|benediction)\b/i;
const SENTENCE_END = /[.!?…]["')\]]?$/;
const MARKER_CHARS = /[*_~`#>]/g;

interface PreambleField {
  pattern: RegExp;
  key: keyof SermonPreamble;
}

interface SermonPreamble {
  reference: string | null;
  preacher: string | null;
  theme: string | null;
}

/**
 * The lines an order-of-service style sermon opens with. They are details about
 * the message rather than the message itself, so they head the deck instead of
 * being preached as body text.
 */
const PREAMBLE_FIELDS: PreambleField[] = [
  {
    pattern:
      /^(?:bible\s+)?(?:text|scripture|passage|reading|memory\s+verse|anchor\s+verse)\s*[:\-–—]\s*(.+)$/i,
    key: "reference",
  },
  {
    pattern:
      /^(?:preacher|minister|speaker|pastor|preached\s+by|delivered\s+by|ministering|facilitator)\s*[:\-–—]\s*(.+)$/i,
    key: "preacher",
  },
  { pattern: /^by\s+(.{2,60})$/i, key: "preacher" },
  {
    pattern: /^(?:theme|topic|subject|title)\s*[:\-–—]\s*(.+)$/i,
    key: "theme",
  },
];

/** Kept on the title slide rather than dropped, so nothing pasted is lost. */
const DETAIL_LINE =
  /^(?:date|venue|series|occasion|service|programme|program|location|time)\s*[:\-–—]\s*(.+)$/i;

type BlockKind = "heading" | "paragraph" | "list";

interface Block {
  kind: BlockKind;
  /** Rendered as written, so inline emphasis survives into the slide. */
  lines: string[];
  /** Height of the block in body-text lines. */
  weight: number;
}

interface Section {
  heading: Block | null;
  label: string;
  type: string;
  blocks: Block[];
}

export interface SermonBuildOptions {
  /** Roughly how many rendered lines one slide should hold. */
  maxLines: number;
  title: string | null;
  author: string | null;
}

const wordCount = (value: string): number =>
  value.trim().split(/\s+/).filter(Boolean).length;

const plain = (value: string): string =>
  value.replace(MARKER_CHARS, "").replace(/\s+/g, " ").trim();

const isBlank = (line: string): boolean =>
  line.trim() === "" || HORIZONTAL_RULE.test(line);

/** How many rendered lines a run of text takes at a given font size. */
function weightFor(text: string, fontSize: number): number {
  const scale = fontSize / BODY_SIZE;
  const charsPerLine = Math.max(12, Math.round(CHARS_PER_LINE / scale));
  return Math.max(1, Math.ceil(plain(text).length / charsPerLine)) * scale;
}

/** True for a line a writer meant as a point or section title, not as prose. */
function isHeadingLine(raw: string): boolean {
  const line = raw.trim();
  if (!line) return false;
  if (MARKDOWN_HEADING.test(line)) return true;
  if (EMPHASIS_HEADING.test(line)) return true;

  const bare = plain(line);
  if (!bare || wordCount(bare) > 12) return false;
  // Shouting a line is how a typed sermon marks its points.
  if (/[A-Z]/.test(bare) && !/[a-z]/.test(bare)) return true;
  if (TRAILING_COLON.test(bare) && wordCount(bare) <= 10) return true;
  if (NAMED_HEADING.test(bare)) return true;

  const enumerated = bare.match(ENUMERATED_HEADING);
  return Boolean(
    enumerated &&
    wordCount(enumerated[1]) <= 10 &&
    !SENTENCE_END.test(enumerated[1].trim()),
  );
}

/** The heading as it should appear on the slide, keeping its own emphasis. */
function headingContent(raw: string): string {
  const line = raw.trim();
  const markdown = line.match(MARKDOWN_HEADING);
  return (markdown ? markdown[1] : line).trim();
}

function headingLabel(raw: string): string {
  const label = plain(headingContent(raw)).replace(/[:.\-–—]\s*$/, "");
  return label.length > LABEL_MAX_CHARS
    ? `${label.slice(0, LABEL_MAX_CHARS - 1).trimEnd()}…`
    : label;
}

/** Groups the document into runs of consecutive non-blank lines. */
function splitBlocks(lines: string[]): string[][] {
  const blocks: string[][] = [];
  let current: string[] = [];
  const flush = () => {
    if (current.length) blocks.push(current);
    current = [];
  };
  for (const raw of lines) {
    if (isBlank(raw)) {
      flush();
      continue;
    }
    current.push(raw.replace(BLOCK_QUOTE, "").trim());
  }
  flush();
  return blocks;
}

/**
 * Splits an oversized paragraph at sentence boundaries so a slide break never
 * lands mid-sentence, falling back to word boundaries for a sentence that is
 * itself longer than a slide.
 */
function splitByWords(text: string, maxChars: number): string[] {
  const pieces: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/)) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && candidate.length > maxChars) {
      pieces.push(current);
      current = word;
    } else current = candidate;
  }
  if (current) pieces.push(current);
  return pieces;
}

function splitParagraph(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  const sentences = text.match(/[^.!?…]+(?:[.!?…]+["')\]]*\s*|$)/g) ?? [text];
  const pieces: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    const candidate = current ? `${current}${sentence}` : sentence;
    if (current && candidate.trim().length > maxChars) {
      pieces.push(current.trim());
      current = sentence;
    } else current = candidate;
  }
  if (current.trim()) pieces.push(current.trim());
  return pieces.flatMap((piece) =>
    piece.length > maxChars * 1.5 ? splitByWords(piece, maxChars) : [piece],
  );
}

/**
 * Turns one run of lines into a block. Soft-wrapped prose is rejoined into a
 * single paragraph, while a run carrying list markers keeps its own lines so
 * the canvas can number and indent them.
 */
function toBlock(lines: string[]): Block {
  if (lines.length === 1 && isHeadingLine(lines[0])) {
    const content = headingContent(lines[0]);
    return {
      kind: "heading",
      lines: [content],
      weight: weightFor(content, HEADING_SIZE),
    };
  }

  const listed = analyzeLines(lines).some((item) => item.kind !== null);
  if (listed)
    return {
      kind: "list",
      lines,
      weight: lines.reduce(
        (total, line) => total + weightFor(line, BODY_SIZE),
        0,
      ),
    };

  const paragraph = lines.join(" ").replace(/\s+/g, " ").trim();
  return {
    kind: "paragraph",
    lines: [paragraph],
    weight: weightFor(paragraph, BODY_SIZE),
  };
}

/** Reads the details a sermon is headed with off the top of the document. */
function readPreamble(lines: string[]): {
  preamble: SermonPreamble;
  details: string[];
  consumed: number;
} {
  const preamble: SermonPreamble = {
    reference: null,
    preacher: null,
    theme: null,
  };
  const details: string[] = [];
  let consumed = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) {
      consumed = i + 1;
      continue;
    }
    const detail = line.match(DETAIL_LINE);
    if (detail) {
      details.push(detail[1].trim());
      consumed = i + 1;
      continue;
    }
    const field = PREAMBLE_FIELDS.find(({ pattern }) => pattern.test(line));
    if (!field) break;
    const value = line.match(field.pattern)?.[1]?.trim();
    if (!value) break;
    if (!preamble[field.key]) preamble[field.key] = value;
    consumed = i + 1;
  }

  return { preamble, details, consumed };
}

/**
 * The topic a sermon opens with when it was typed without a declared heading:
 * a short line standing on its own above the message. A line naming a part of
 * the sermon ("Introduction", "Point 1") is a section, not the topic, so it is
 * left where the writer put it.
 */
function leadingTitle(
  lines: string[],
): { title: string; consumed: number } | null {
  const index = lines.findIndex((line) => line.trim() !== "");
  if (index === -1) return null;

  const line = lines[index].trim();
  const next = lines[index + 1];
  // A title stands alone: prose running straight on underneath is a paragraph.
  if (next !== undefined && next.trim() !== "") return null;

  const content = plain(headingContent(line));
  if (!content || wordCount(content) > 12) return null;
  if (NAMED_HEADING.test(content)) return null;
  if (SENTENCE_END.test(content)) return null;

  return { title: content, consumed: index + 1 };
}

const mergePreambles = (
  first: SermonPreamble,
  second: SermonPreamble,
): SermonPreamble => ({
  reference: first.reference ?? second.reference,
  preacher: first.preacher ?? second.preacher,
  theme: first.theme ?? second.theme,
});

function buildTitleSlide(
  title: string | null,
  preamble: SermonPreamble,
  details: string[],
  author: string | null,
): Slide | null {
  const headline = title || preamble.theme;
  const preacher = preamble.preacher || author;
  const credits = [
    preamble.theme && preamble.theme !== headline ? preamble.theme : null,
    preamble.reference,
    preacher,
    ...details,
  ].filter((value): value is string => Boolean(value));

  if (!headline && !credits.length) return null;

  const lines = headline ? [headline] : [];
  if (credits.length) {
    if (lines.length) lines.push("");
    lines.push(...credits);
  }

  const lineOverrides: Record<number, TextStyle> = {};
  lines.forEach((_, index) => {
    if (index === 0 && headline) {
      lineOverrides[index] = { fontSize: TITLE_SIZE, fontWeight: 700 };
      return;
    }
    lineOverrides[index] = { fontSize: CREDIT_SIZE };
  });

  return {
    id: uid(),
    type: "title",
    label: "Title",
    lines: [],
    overrides: { align: "center", lineHeight: 1.4 },
    textBoxes: [
      createSlideTextBox({
        frame: SERMON_TITLE_FRAME,
        lines,
        lineOverrides,
        verticalAlign: "middle",
      }),
    ],
    notes: "",
  };
}

/** Groups blocks under the heading that introduced them. */
function buildSections(blocks: Block[]): Section[] {
  const sections: Section[] = [];
  const usedLabels = new Map<string, number>();

  const uniqueLabel = (base: string): string => {
    const seen = (usedLabels.get(base.toLowerCase()) ?? 0) + 1;
    usedLabels.set(base.toLowerCase(), seen);
    return seen > 1 ? `${base} ${seen}` : base;
  };

  for (const block of blocks) {
    if (block.kind === "heading") {
      sections.push({
        heading: block,
        label: uniqueLabel(headingLabel(block.lines[0]) || "Point"),
        type: "point",
        blocks: [],
      });
      continue;
    }
    const current = sections[sections.length - 1];
    if (current) {
      current.blocks.push(block);
      continue;
    }
    sections.push({
      heading: null,
      label: uniqueLabel("Opening"),
      type: "body",
      blocks: [block],
    });
  }

  return sections.filter(
    (section) => section.heading !== null || section.blocks.length > 0,
  );
}

interface SlideDraft {
  lines: string[];
  /** Index of the heading line, styled larger than the body around it. */
  headingLine: number | null;
}

const paragraphPiece = (text: string): Block => ({
  kind: "paragraph",
  lines: [text],
  weight: weightFor(text, BODY_SIZE),
});

/**
 * Fills slides with as many whole blocks as the budget allows.
 *
 * A heading never ends up alone on a slide: when the paragraph under it does not
 * fit beside it, the paragraph is broken at a sentence to fill the room that is
 * left and carries on overleaf, which is what a printed page does.
 */
function chunkSection(section: Section, budget: number): SlideDraft[] {
  const maxChars = Math.round(budget * CHARS_PER_LINE);
  const queue: Block[] = section.blocks.flatMap((block) =>
    block.kind === "paragraph"
      ? splitParagraph(block.lines[0], maxChars).map(paragraphPiece)
      : [block],
  );

  const drafts: SlideDraft[] = [];
  let lines: string[] = [];
  let headingLine: number | null = null;
  let used = 0;
  let hasBody = false;

  const flush = () => {
    if (!lines.length) return;
    drafts.push({ lines, headingLine });
    lines = [];
    headingLine = null;
    used = 0;
    hasBody = false;
  };

  if (section.heading) {
    headingLine = 0;
    lines = [...section.heading.lines];
    used = section.heading.weight;
  }

  while (queue.length) {
    const piece = queue.shift();
    if (!piece) break;
    const gap = lines.length ? BLOCK_GAP_WEIGHT : 0;
    const room = budget - used - gap;

    if (piece.weight > room && lines.length) {
      if (hasBody) {
        queue.unshift(piece);
        flush();
        continue;
      }
      // Only the heading is on the slide, so the paragraph is trimmed to what
      // fits rather than leaving a heading with nothing under it.
      if (piece.kind === "paragraph" && room >= 1) {
        const parts = splitParagraph(
          piece.lines[0],
          Math.round(room * CHARS_PER_LINE),
        );
        if (parts.length > 1) {
          queue.unshift(...parts.map(paragraphPiece));
          continue;
        }
      }
    }

    if (lines.length) lines.push("");
    lines.push(...piece.lines);
    used += gap + piece.weight;
    hasBody = true;
  }
  flush();

  return drafts.length ? drafts : [{ lines: [], headingLine: null }];
}

function toSlide(
  draft: SlideDraft,
  section: Section,
  index: number,
  total: number,
): Slide {
  const lineOverrides: Record<number, TextStyle> = {};
  if (draft.headingLine !== null)
    lineOverrides[draft.headingLine] = {
      fontSize: HEADING_SIZE,
      fontWeight: 700,
    };

  return {
    id: uid(),
    type: section.type,
    label:
      total > 1 ? `${section.label} · ${index + 1}/${total}` : section.label,
    lines: [],
    // Left on the slide rather than on the box: the box inherits them, so
    // restyling the slide still reaches the words inside it.
    overrides: {
      align: "left",
      fontSize: BODY_SIZE,
      lineHeight: BODY_LINE_HEIGHT,
    },
    textBoxes: [
      createSlideTextBox({
        frame: SERMON_BODY_FRAME,
        lines: draft.lines.length ? draft.lines : [""],
        lineOverrides: Object.keys(lineOverrides).length
          ? lineOverrides
          : undefined,
        verticalAlign: "top",
      }),
    ],
    notes: "",
  };
}

export interface SermonDeck {
  slides: Slide[];
  /** The topic, when the sermon named one the document heading had not. */
  title: string | null;
  /** The preacher credited in the document, if any. */
  author: string | null;
}

/**
 * Builds a sermon deck from the body of the document (everything the manuscript
 * heading did not already claim), reporting the topic and preacher it found on
 * the way so the manuscript itself can be named after them.
 */
export function buildSermonSlides(
  lines: string[],
  options: SermonBuildOptions,
): SermonDeck {
  const budget = Math.max(MIN_SLIDE_WEIGHT, options.maxLines);
  const opening = readPreamble(lines);
  let preamble = opening.preamble;
  let details = opening.details;
  let title = options.title;
  let body = lines.slice(opening.consumed);

  // Nothing declared the document, so the topic is read off the top of it and
  // whatever is credited underneath is read with it.
  if (!title) {
    const lead = leadingTitle(body);
    if (lead) {
      title = lead.title;
      const credited = readPreamble(body.slice(lead.consumed));
      preamble = mergePreambles(preamble, credited.preamble);
      details = [...details, ...credited.details];
      body = body.slice(lead.consumed + credited.consumed);
    }
  }

  const slides: Slide[] = [];
  const titleSlide = buildTitleSlide(title, preamble, details, options.author);
  if (titleSlide) slides.push(titleSlide);

  const sections = buildSections(splitBlocks(body).map(toBlock));
  for (const section of sections) {
    const drafts = chunkSection(section, budget);
    drafts.forEach((draft, index) =>
      slides.push(toSlide(draft, section, index, drafts.length)),
    );
  }

  return { slides, title, author: preamble.preacher };
}
