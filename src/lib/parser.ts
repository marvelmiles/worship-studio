import type { ManuscriptFormat, Slide, TextStyle } from "../types";
import type { Collection } from "../data/collections";
import { uid } from "./id";
import {
  chunkToFit,
  slideChunkLabel,
  slideRowCapacity,
  slideTextMetrics,
  type SlideTextMetrics,
} from "./slideLayout";
import { defaultFormatForCollection } from "./manuscript/format";
import { extractManuscriptMetadata } from "./manuscript/metadata";
import { readHymnalSource } from "./manuscript/hymnal";
import { buildSermonSlides } from "./manuscript/sermon";
import {
  readStanzaOpener,
  usesBareStanzaNumbers,
} from "./manuscript/numbering";
import {
  extractRepeatCount,
  extractSectionReference,
  matchRepeatDirective,
} from "./manuscript/repeats";
import {
  canonicalSectionLabel,
  isKnownSection,
  matchSectionHeader,
  sectionMetaFor,
} from "./manuscript/sections";

export { SECTION_MAP } from "./manuscript/sections";

const HORIZONTAL_RULE = /^\s*([-*_])\s*(?:\1\s*){2,}$/;
const BLOCK_QUOTE = /^\s*>\s?/;

interface LyricLine {
  text: string;
  repeat: number | null;
  reference: string | null;
}

interface RepeatCue {
  target: string | null;
  count: number | null;
}

interface Section {
  type: string;
  baseLabel: string;
  explicitNum: number | null;
  named: boolean;
  repeat: number | null;
  lines: LyricLine[];
  cues: RepeatCue[];
}

interface NoteRequest {
  slide: number;
  target: string | null;
  count: number | null;
}

const isBreak = (line: string): boolean =>
  line.trim() === "" || HORIZONTAL_RULE.test(line);

const hasContent = (section: Section): boolean =>
  section.lines.some((line) => line.text.trim() !== "");

const labelWithNumber = (section: Section): string =>
  section.explicitNum !== null
    ? `${section.baseLabel} ${section.explicitNum}`
    : section.baseLabel;

const newSection = (
  type: string,
  baseLabel: string,
  explicitNum: number | null,
  named: boolean,
  repeat: number | null = null,
): Section => {
  return { type, baseLabel, explicitNum, named, repeat, lines: [], cues: [] };
};

const pushLine = (section: Section, raw: string): void => {
  const withoutReference = extractSectionReference(raw, isKnownSection);
  const withoutCount = extractRepeatCount(withoutReference.text);
  const text =
    section.explicitNum !== null ? withoutCount.text.trim() : withoutCount.text;

  if (text.trim()) {
    section.lines.push({
      text,
      repeat: withoutCount.count,
      reference: withoutReference.reference,
    });
    return;
  }

  if (withoutCount.count === null && !withoutReference.reference) return;

  const previous = [...section.lines]
    .reverse()
    .find((line) => line.text.trim() !== "");
  if (previous) {
    previous.repeat =
      Math.max(previous.repeat ?? 0, withoutCount.count ?? 0) || null;
    previous.reference = withoutReference.reference ?? previous.reference;
    return;
  }
  section.cues.push({
    target: withoutReference.reference,
    count: withoutCount.count,
  });
};

const stanzaOpeners = (lines: string[]): string[] => {
  const openers: string[] = [];
  let atBlockStart = true;
  for (const raw of lines) {
    if (isBreak(raw)) {
      atBlockStart = true;
      continue;
    }
    if (matchSectionHeader(raw)) {
      atBlockStart = true;
      continue;
    }
    if (atBlockStart) openers.push(raw);
    atBlockStart = false;
  }
  return openers;
};

const startsUntagged = (lines: string[]): boolean => {
  for (const line of lines) {
    if (isBreak(line)) continue;
    if (matchSectionHeader(line)) return false;
    if (matchRepeatDirective(line, isKnownSection)) continue;
    return true;
  }
  return false;
};

const buildSections = (
  lines: string[],
  allowBareNumbers: boolean,
  stanzaMode: boolean,
): Section[] => {
  const sections: Section[] = [];
  let current: Section | null = null;
  let pendingBreak = true;

  const addCue = (cue: RepeatCue) => {
    const host =
      current && hasContent(current)
        ? current
        : [...sections].reverse().find(hasContent);
    if (host) host.cues.push(cue);
  };

  for (const raw of lines) {
    const line = raw.replace(BLOCK_QUOTE, "").replace(/\s+$/, "");

    if (isBreak(line)) {
      pendingBreak = true;
      if (current?.named && !stanzaMode)
        current.lines.push({ text: "", repeat: null, reference: null });
      continue;
    }

    const header = matchSectionHeader(line);
    if (header) {
      const meta = sectionMetaFor(header.base);
      current = newSection(
        meta.type,
        meta.label,
        header.num,
        true,
        header.repeat,
      );
      sections.push(current);
      pendingBreak = false;
      if (header.content) pushLine(current, header.content);
      continue;
    }

    const directive = matchRepeatDirective(line, isKnownSection);
    if (directive) {
      addCue({ target: directive.target, count: directive.count });
      pendingBreak = true;
      continue;
    }

    const stanza = readStanzaOpener(line, allowBareNumbers);
    if (
      stanza !== null ||
      !current ||
      (pendingBreak && (stanzaMode || !current.named))
    ) {
      current = newSection("verse", "Verse", stanza?.number ?? null, false);
      sections.push(current);
    }
    pendingBreak = false;
    pushLine(current, stanza?.text ?? line);
  }

  return sections;
};

const compactSections = (sections: Section[]): Section[] => {
  const kept: Section[] = [];
  for (const section of sections) {
    if (hasContent(section)) {
      kept.push(section);
      continue;
    }
    const previous = kept[kept.length - 1];
    if (!previous) continue;
    if (section.named)
      previous.cues.push({
        target: labelWithNumber(section),
        count: section.repeat,
      });
    previous.cues.push(...section.cues);
  }
  return kept;
};

/**
 * Blank lines still break a stanza by hand; within a stanza the slide is cut
 * wherever the next line would no longer fit at the deck's text size.
 */
const chunkSection = (
  lines: LyricLine[],
  maxLines: number,
  metrics: SlideTextMetrics,
): LyricLine[][] => {
  const chunks: LyricLine[][] = [];
  let block: LyricLine[] = [];
  const flush = () => {
    if (!block.length) return;
    chunks.push(
      ...chunkToFit(block, (line) => line.text, metrics, { maxLines }),
    );
    block = [];
  };
  for (const line of lines) {
    if (!line.text.trim()) {
      flush();
      continue;
    }
    block.push(line);
  }
  flush();
  return chunks.length ? chunks : [[]];
};

const resolveOrder = (
  sections: Section[],
): {
  order: number[];
  numbers: (number | null)[];
} => {
  const slotsByLabel: Record<string, number[]> = {};
  sections.forEach((section, i) =>
    (slotsByLabel[section.baseLabel] ||= []).push(i),
  );

  const numbers: (number | null)[] = sections.map(() => null);
  const order = sections.map((_, i) => i);

  for (const slots of Object.values(slotsByLabel)) {
    if (slots.length < 2 && sections[slots[0]].explicitNum === null) continue;

    const claimed = new Set<number>();
    for (const i of slots) {
      const explicit = sections[i].explicitNum;
      if (explicit !== null && !claimed.has(explicit)) {
        numbers[i] = explicit;
        claimed.add(explicit);
      }
    }
    let next = 1;
    for (const i of slots) {
      if (numbers[i] !== null) continue;
      while (claimed.has(next)) next++;
      numbers[i] = next;
      claimed.add(next++);
    }

    const sortedByNumber = [...slots].sort((a, b) => numbers[a]! - numbers[b]!);
    slots.forEach((slot, rank) => (order[slot] = sortedByNumber[rank]));
  }

  return { order, numbers };
};

const noteText = (
  target: string | null,
  count: number | null,
  slideNumber: number | null,
): string => {
  const times = count && count > 1 ? ` ${count}x` : "";
  if (!target) return `Repeat${times || " 2x"}`;
  const label = canonicalSectionLabel(target);
  return slideNumber !== null
    ? `Repeat slide ${slideNumber} (${label})${times}`
    : `Repeat ${label}${times}`;
};

export interface ParsedManuscript {
  title: string | null;
  author: string | null;
  collection: Collection | null;
  slides: Slide[];
}

export interface ParseManuscriptOptions {
  maxLines?: number;
  format?: ManuscriptFormat;
  /** The deck's resolved text style, which decides how much fits on a slide. */
  style?: Pick<TextStyle, "fontSize" | "lineHeight"> | null;
}

/** How many written lines a slide holds at the default text size. */
export const defaultMaxLines = (
  style?: Pick<TextStyle, "fontSize" | "lineHeight"> | null,
): number => slideRowCapacity(slideTextMetrics(style));

const emptySlide = (): Slide => ({
  id: uid(),
  type: "verse",
  label: "Slide 1",
  lines: ["(empty)"],
  overrides: {},
  notes: "",
});

export const parseManuscript = (
  text: string,
  options: ParseManuscriptOptions = {},
): ParsedManuscript => {
  const metrics = slideTextMetrics(options.style);
  const maxLines = options.maxLines ?? slideRowCapacity(metrics);
  const source = readHymnalSource(text);
  const allLines = source.text.split("\n");
  const metadata = extractManuscriptMetadata(allLines);
  const lines = allLines.slice(metadata.consumed);

  const format =
    options.format ??
    (metadata.collection
      ? defaultFormatForCollection(metadata.collection)
      : "song");

  if (format === "sermon") {
    const sermon = buildSermonSlides(lines, {
      maxLines,
      title: metadata.title,
      author: metadata.author,
    });
    return {
      title: metadata.title ?? sermon.title,
      author: metadata.author ?? sermon.author ?? source.author,
      collection: metadata.collection,
      slides: sermon.slides.length ? sermon.slides : [emptySlide()],
    };
  }

  const allowBareNumbers = usesBareStanzaNumbers(stanzaOpeners(lines));
  let sections = compactSections(
    buildSections(lines, allowBareNumbers, startsUntagged(lines)),
  );

  if (!sections.length && lines.some((line) => line.trim())) {
    const fallback = newSection("verse", "Verse", null, false);
    for (const line of lines) if (line.trim()) pushLine(fallback, line);
    sections = [fallback];
  }

  const { order, numbers } = resolveOrder(sections);

  const slides: Slide[] = [];
  const noteRequests: NoteRequest[] = [];
  const slideByLabel = new Map<string, number>();
  const slideByBase = new Map<string, number>();

  order.forEach((sourceIndex) => {
    const section = sections[sourceIndex];
    const number = numbers[sourceIndex];
    const label =
      number !== null ? `${section.baseLabel} ${number}` : section.baseLabel;
    const chunks = chunkSection(section.lines, maxLines, metrics);
    const firstSlide = slides.length;
    const flowId = uid();

    chunks.forEach((chunk, i) => {
      const slideIndex = slides.length;
      slides.push({
        id: uid(),
        type: section.type,
        flowId,
        label: slideChunkLabel(label, i, chunks.length),
        lines: chunk.map((line) => line.text),
        overrides: {},
        notes: "",
      });
      for (const line of chunk) {
        if (line.repeat !== null || line.reference !== null)
          noteRequests.push({
            slide: slideIndex,
            target: line.reference,
            count: line.repeat,
          });
      }
    });

    const lastSlide = slides.length - 1;
    if (!slideByLabel.has(label.toLowerCase()))
      slideByLabel.set(label.toLowerCase(), firstSlide);
    if (!slideByBase.has(section.baseLabel.toLowerCase()))
      slideByBase.set(section.baseLabel.toLowerCase(), firstSlide);

    if (section.repeat !== null)
      noteRequests.push({
        slide: lastSlide,
        target: null,
        count: section.repeat,
      });
    for (const cue of section.cues)
      noteRequests.push({
        slide: lastSlide,
        target: cue.target,
        count: cue.count,
      });
  });

  const notesBySlide = new Map<number, string[]>();
  for (const request of noteRequests) {
    if (!slides[request.slide]) continue;
    let slideNumber: number | null = null;
    if (request.target) {
      const key = canonicalSectionLabel(request.target).toLowerCase();
      const found = slideByLabel.get(key) ?? slideByBase.get(key);
      if (found !== undefined && found !== request.slide)
        slideNumber = found + 1;
    }
    const note = noteText(request.target, request.count, slideNumber);
    const existing = notesBySlide.get(request.slide) ?? [];
    if (!existing.includes(note)) existing.push(note);
    notesBySlide.set(request.slide, existing);
  }
  notesBySlide.forEach((notes, index) => {
    slides[index].notes = notes.join("\n");
  });

  if (!slides.length) slides.push(emptySlide());

  return {
    title: metadata.title,
    author: metadata.author ?? source.author,
    collection: metadata.collection,
    slides,
  };
};

export const parseManuscriptSlides = (
  text: string,
  options: ParseManuscriptOptions = {},
): Slide[] => {
  return parseManuscript(text, options).slides;
};
