import type { Slide } from "../types";
import { uid } from "./id";
import { extractSongMetadata } from "./lyrics/metadata";
import { matchStanzaNumber, usesBareStanzaNumbers } from "./lyrics/numbering";
import {
  extractRepeatCount,
  extractSectionReference,
  matchRepeatDirective,
} from "./lyrics/repeats";
import {
  canonicalSectionLabel,
  isKnownSection,
  matchSectionHeader,
  sectionMetaFor,
} from "./lyrics/sections";

export { SECTION_MAP } from "./lyrics/sections";

/** Markdown thematic break (`---`, `***`, `___`) used as a stanza separator. */
const HORIZONTAL_RULE = /^\s*([-*_])\s*(?:\1\s*){2,}$/;
const BLOCK_QUOTE = /^\s*>\s?/;

interface LyricLine {
  text: string;
  /** `(2x)` found on this line, lifted out of the text. */
  repeat: number | null;
  /** `[Refrain]` found at the end of this line. */
  reference: string | null;
}

/** "Sing this again", either a bare count or a pointer at another section. */
interface RepeatCue {
  target: string | null;
  count: number | null;
}

interface Section {
  type: string;
  baseLabel: string;
  /** Explicit number from the tag or stanza opener, e.g. "Verse 3" -> 3. */
  explicitNum: number | null;
  /** Introduced by a header, which makes blank lines page breaks, not new verses. */
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

function newSection(
  type: string,
  baseLabel: string,
  explicitNum: number | null,
  named: boolean,
  repeat: number | null = null,
): Section {
  return { type, baseLabel, explicitNum, named, repeat, lines: [], cues: [] };
}

/**
 * Adds one lyric line, lifting its repeat markers out as it goes. A line that
 * was nothing but a marker folds onto the line above instead of leaving a gap.
 */
function pushLine(section: Section, raw: string): void {
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
}

/** Stanza-opening lines, used to decide whether bare numbers mean anything. */
function stanzaOpeners(lines: string[]): string[] {
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
}

/**
 * True when lyrics appear before the document's first section header.
 *
 * It decides what a blank line means. In a fully tagged document every stanza
 * sits under a header, so a blank line is only a page break inside that
 * section. Once a document mixes tagged sections with loose stanzas, a blank
 * line is the writer starting something new, so it opens a fresh verse.
 */
function startsUntagged(lines: string[]): boolean {
  for (const line of lines) {
    if (isBreak(line)) continue;
    if (matchSectionHeader(line)) return false;
    if (matchRepeatDirective(line, isKnownSection)) continue;
    return true;
  }
  return false;
}

function buildSections(
  lines: string[],
  allowBareNumbers: boolean,
  stanzaMode: boolean,
): Section[] {
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

    const stanzaNumber = matchStanzaNumber(line, allowBareNumbers);
    if (
      stanzaNumber !== null ||
      !current ||
      (pendingBreak && (stanzaMode || !current.named))
    ) {
      current = newSection("verse", "Verse", stanzaNumber, false);
      sections.push(current);
    }
    pendingBreak = false;
    pushLine(current, line);
  }

  return sections;
}

/**
 * Drops sections that never got any lyrics. An empty `Chorus:` is not a slide
 * to build, it is the writer saying "sing the chorus again here", so it turns
 * into a cue on the section before it.
 */
function compactSections(sections: Section[]): Section[] {
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
}

/** Split a section into slide-sized chunks. Blank lines are hard breaks. */
function chunkSection(lines: LyricLine[], maxLines: number): LyricLine[][] {
  const chunks: LyricLine[][] = [];
  let current: LyricLine[] = [];
  const flush = () => {
    if (current.length) {
      chunks.push(current);
      current = [];
    }
  };
  for (const line of lines) {
    if (!line.text.trim()) {
      flush();
      continue;
    }
    current.push(line);
    if (current.length >= maxLines) flush();
  }
  flush();
  return chunks.length ? chunks : [[]];
}

/**
 * Resolve each section's final number: explicit numbers (e.g. "Verse 3") are
 * reserved first, then unnumbered sections fill in whatever's left, smallest
 * first, in document order. Slides of the same label are then reordered into
 * ascending numeric order, so typing Verse 2 before Verse 1 still presents
 * Verse 1 first, while sections of other labels keep their own position.
 */
function resolveOrder(sections: Section[]): {
  order: number[];
  numbers: (number | null)[];
} {
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
}

function noteText(
  target: string | null,
  count: number | null,
  slideNumber: number | null,
): string {
  const times = count && count > 1 ? ` ${count}x` : "";
  if (!target) return `Repeat${times || " 2x"}`;
  const label = canonicalSectionLabel(target);
  return slideNumber !== null
    ? `Repeat slide ${slideNumber} (${label})${times}`
    : `Repeat ${label}${times}`;
}

export interface ParsedSong {
  title: string | null;
  artist: string | null;
  slides: Slide[];
}

/**
 * Turns a pasted lyric document into a presentable deck.
 *
 * Sections are recognised however they were written: `[Verse 2]`, `## Chorus`,
 * `**Chorus**`, `Chorus:`, `Chorus: first line`, `Choir- first line`,
 * `(Adlibs)` or a bare `Bridge` on its own line. Performer cues such as
 * `Soloist:` and `Choir:` count as sections too. Untagged lyrics fall back to
 * blank-line stanzas, and a stanza opening with `1.`, `(2)`, `IV.` or, in a
 * document that reads like a numbered hymn, a bare `3`, keeps that number.
 *
 * Repeat shorthand never reaches the screen. `(2x)`, `/2ce`, `[4x]` and the
 * like are lifted into the slide's presenter notes, and a cue that points at
 * another section (`Repeat Chorus (3x)`, a trailing `[Refrain]`, an empty
 * `Chorus:`) builds no duplicate slide at all: it notes "Repeat slide 4
 * (Chorus)" on the slide the operator is already looking at.
 */
export function parseSongDocument(text: string, maxLines = 6): ParsedSong {
  const normalized = (text || "").replace(/\r\n?/g, "\n");
  const allLines = normalized.split("\n");
  const metadata = extractSongMetadata(allLines);
  const lines = allLines.slice(metadata.consumed);

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
    const chunks = chunkSection(section.lines, maxLines);
    const firstSlide = slides.length;

    chunks.forEach((chunk, i) => {
      const slideIndex = slides.length;
      slides.push({
        id: uid(),
        type: section.type,
        label:
          chunks.length > 1 ? `${label} · ${i + 1}/${chunks.length}` : label,
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
      // A cue pointing at the slide it sits on is just a repeat count.
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

  if (!slides.length)
    slides.push({
      id: uid(),
      type: "verse",
      label: "Slide 1",
      lines: ["(empty)"],
      overrides: {},
      notes: "",
    });

  return { title: metadata.title, artist: metadata.artist, slides };
}

/** Convert raw lyrics into slides. See `parseSongDocument` for the full rules. */
export function parseLyrics(text: string, maxLines = 6): Slide[] {
  return parseSongDocument(text, maxLines).slides;
}
