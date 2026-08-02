import type { Slide } from "../types";
import { uid } from "./id";

interface SectionMeta {
  type: string;
  label: string;
}

/** Maps a recognised tag key to its slide type and display label. [solo] is
 * treated as a verse so it shares verse numbering and the verse-only
 * Ctrl+number jump shortcuts. */
export const SECTION_MAP: Record<string, SectionMeta> = {
  intro: { type: "intro", label: "Intro" },
  verse: { type: "verse", label: "Verse" },
  solo: { type: "verse", label: "Verse" },
  chorus: { type: "chorus", label: "Chorus" },
  bridge: { type: "bridge", label: "Bridge" },
  outro: { type: "outro", label: "Outro" },
  tag: { type: "tag", label: "Tag" },
  refrain: { type: "refrain", label: "Refrain" },
  prechorus: { type: "pre-chorus", label: "Pre-Chorus" },
  "pre-chorus": { type: "pre-chorus", label: "Pre-Chorus" },
  "pre chorus": { type: "pre-chorus", label: "Pre-Chorus" },
  ending: { type: "ending", label: "Ending" },
};

interface Section {
  type: string;
  baseLabel: string;
  /** Explicit number from the tag itself, e.g. "Verse 3" -> 3. Null if untagged. */
  explicitNum: number | null;
  lines: string[];
}

interface SectionHeader {
  base: string;
  num: number | null;
}

/** `[Chorus]`, `[Verse 2]` — an explicit tag, any name allowed. */
const BRACKET_HEADER = /^\s*\[([a-zA-Z0-9 -]{1,24})\]\s*$/;
/** Markdown headings, `# Chorus` / `### Verse 2` — any name allowed. */
const MARKDOWN_HEADER = /^\s*#{1,6}\s+(.{1,24}?)\s*#*\s*$/;
/** `**Chorus**`, `_Verse 2_` — a decorated line, known section names only. */
const EMPHASIS_HEADER =
  /^\s*(?:\*{1,3}|_{1,3}|~~)\s*([a-zA-Z0-9 -]{1,24}?)\s*(?:\*{1,3}|_{1,3}|~~)\s*:?\s*$/;
/** `Chorus:`, `Verse 2:` — known section names only. */
const COLON_HEADER = /^\s*([a-zA-Z][a-zA-Z0-9 -]{0,23}?)\s*:\s*$/;
/** A bare `Chorus` line on its own — known section names only. */
const PLAIN_HEADER = /^\s*([a-zA-Z][a-zA-Z0-9 -]{0,23})\s*$/;

/** Markdown thematic break (`---`, `***`, `___`) used as a stanza separator. */
const HORIZONTAL_RULE = /^\s*([-*_])\s*(?:\1\s*){2,}$/;
const BLOCK_QUOTE = /^\s*>\s?/;

/**
 * A stanza number leading its first line: `1.`, `2)`, `(3)`, `4 -`, `IV.`
 * A delimiter is required so ordinary lyric lines ("I am the Lord", "7 days
 * a week") are never mistaken for numbering.
 */
const STANZA_NUMBER =
  /^\s*(?:\(\s*(\d{1,3}|[IVXLCDM]{1,7})\s*\)|(\d{1,3}|[IVXLCDM]{1,7})\s*[.)\]:-])\s+\S/;

const ROMAN_VALUES: Record<string, number> = {
  I: 1,
  V: 5,
  X: 10,
  L: 50,
  C: 100,
  D: 500,
  M: 1000,
};

function romanToNumber(token: string): number | null {
  let total = 0;
  let highest = 0;
  for (let i = token.length - 1; i >= 0; i--) {
    const value = ROMAN_VALUES[token[i]];
    if (!value) return null;
    total += value < highest ? -value : value;
    highest = Math.max(highest, value);
  }
  return total > 0 ? total : null;
}

/** The stanza number a line opens with, e.g. "2. Under the shadow" -> 2. */
function matchStanzaNumber(line: string): number | null {
  const match = line.match(STANZA_NUMBER);
  if (!match) return null;
  const token = match[1] ?? match[2];
  if (/^\d+$/.test(token)) {
    const value = parseInt(token, 10);
    return value > 0 ? value : null;
  }
  return romanToNumber(token);
}

/** Splits a tag's inner text into its base name and an optional trailing
 * number, e.g. "Verse 3" / "Verse-3" / "Verse3" -> { base: "Verse", num: 3 }. */
function splitTagNumber(raw: string): { base: string; num: number | null } {
  const m = raw.match(/^(.*?)[\s-]*(\d+)$/);
  if (m && m[1].trim()) return { base: m[1].trim(), num: parseInt(m[2], 10) };
  return { base: raw.trim(), num: null };
}

const isKnownSection = (name: string): boolean =>
  Boolean(SECTION_MAP[splitTagNumber(name).base.toLowerCase()]);

/**
 * Recognises every way a section gets marked in the wild: the app's own
 * `[Verse 2]` tags, Markdown headings, an emphasised or colon-terminated
 * name, or the bare word on its own line. The looser forms only count when
 * they name a section the app knows, so a one-word lyric line stays a lyric.
 */
function matchSectionHeader(line: string): SectionHeader | null {
  const explicit = line.match(BRACKET_HEADER) || line.match(MARKDOWN_HEADER);
  if (explicit) return splitTagNumber(explicit[1]);

  for (const pattern of [EMPHASIS_HEADER, COLON_HEADER, PLAIN_HEADER]) {
    const match = line.match(pattern);
    if (match && isKnownSection(match[1])) return splitTagNumber(match[1]);
  }
  return null;
}

function sectionFor(header: SectionHeader): Section {
  const key = header.base.toLowerCase();
  const meta = SECTION_MAP[key];
  return {
    type: meta ? meta.type : "custom",
    baseLabel:
      meta?.label || header.base.charAt(0).toUpperCase() + header.base.slice(1),
    explicitNum: header.num,
    lines: [],
  };
}

/** Drops Markdown line-level markup that should never reach the screen. */
const cleanLine = (line: string): string =>
  line.replace(BLOCK_QUOTE, "").replace(/\s+$/, "");

const isBreak = (line: string): boolean =>
  line.trim() === "" || HORIZONTAL_RULE.test(line);

/** Split a section's lines into slide chunks. Blank lines are hard breaks. */
function chunkLines(lines: string[], maxLines: number): string[][] {
  const chunks: string[][] = [];
  let currentChunk: string[] = [];
  const flush = () => {
    if (currentChunk.length) {
      chunks.push(currentChunk);
      currentChunk = [];
    }
  };
  for (const raw of lines) {
    const line = raw.replace(/\s+$/g, "");
    if (line.trim() === "") {
      flush();
      continue;
    }
    currentChunk.push(line);
    if (currentChunk.length >= maxLines) flush();
  }
  flush();
  return chunks.length ? chunks : [[]];
}

/** Tagged lyrics: every section starts at a header line. */
function buildTaggedSections(lines: string[]): Section[] {
  const sections: Section[] = [];
  let current: Section | null = null;

  for (const raw of lines) {
    const header = matchSectionHeader(raw);
    if (header) {
      current = sectionFor(header);
      sections.push(current);
      continue;
    }
    const line = isBreak(raw) ? "" : cleanLine(raw);
    if (current) {
      current.lines.push(line);
    } else if (line.trim() !== "") {
      current = {
        type: "verse",
        baseLabel: "Verse",
        explicitNum: null,
        lines: [line],
      };
      sections.push(current);
    }
  }
  return sections;
}

/**
 * Untagged lyrics: a blank line or a thematic break starts a new verse, and so
 * does a numbered stanza opener, which also claims that number as its verse
 * number. The numbering itself stays in the text, hymn books read that way.
 */
function buildStanzaSections(lines: string[]): Section[] {
  const sections: Section[] = [];
  let current: Section | null = null;
  let pendingBreak = true;

  for (const raw of lines) {
    if (isBreak(raw)) {
      pendingBreak = true;
      continue;
    }
    const line = cleanLine(raw);
    const stanzaNumber = matchStanzaNumber(line);
    if (!current || pendingBreak || stanzaNumber !== null) {
      current = {
        type: "verse",
        baseLabel: "Verse",
        explicitNum: stanzaNumber,
        lines: [],
      };
      sections.push(current);
      pendingBreak = false;
    }
    // Numbered stanzas are usually hanging-indented under their number; that
    // indentation is layout, not lyrics.
    current.lines.push(current.explicitNum !== null ? line.trim() : line);
  }
  return sections;
}

/**
 * Convert raw lyrics into slides.
 * - Recognises [verse], [chorus], [bridge], [intro], [outro], [tag],
 *   [refrain], [pre-chorus] (and custom tags). [solo] is treated as a verse.
 *   The same sections are recognised as Markdown headings (`## Chorus`), as an
 *   emphasised or colon-terminated name (`**Chorus**`, `Chorus:`) and as the
 *   bare word on its own line.
 * - A section label is numbered (Verse 1, Verse 2) only when it repeats.
 * - A tag may include an explicit number, e.g. [Verse 3]. Explicit numbers are
 *   reserved first; sections left without one fill in whatever numbers remain,
 *   smallest first, in the order they appear. Slides of the same label are
 *   then reordered into ascending numeric order, e.g. typing Verse 2 before
 *   Verse 1 still presents Verse 1 first. Other section types keep their own
 *   position, so a Verse/Chorus/Verse/Chorus skeleton is preserved even while
 *   the verses themselves get sorted into place.
 * - Untagged lyrics: blank-line-separated stanzas become numbered verses, and
 *   a stanza opening with `1.`, `(2)` or `IV.` takes that as its verse number
 *   while keeping the numbering on screen.
 * - Inline Markdown emphasis (`**bold**`, `*italic*`, `~~strikethrough~~`) is
 *   left in the text and rendered by the slide canvas.
 * - Long sections are split across slides at `maxLines`.
 */
export function parseLyrics(text: string, maxLines = 6): Slide[] {
  const normalizedText = (text || "").replace(/\r\n?/g, "\n");
  const lines = normalizedText.split("\n");
  const hasHeaders = lines.some((line) => matchSectionHeader(line) !== null);

  let sections = hasHeaders
    ? buildTaggedSections(lines)
    : buildStanzaSections(lines);

  if (!sections.length && normalizedText.trim())
    sections = [
      {
        type: "verse",
        baseLabel: "Verse",
        explicitNum: null,
        lines: lines.map(cleanLine),
      },
    ];

  // Resolve each section's final number: explicit numbers (e.g. "Verse 3") are
  // reserved first, then unnumbered sections fill in whatever's left, smallest
  // first, in document order.
  const slotsByLabel: Record<string, number[]> = {};
  sections.forEach((section, i) =>
    (slotsByLabel[section.baseLabel] ||= []).push(i),
  );

  const resolvedNumbers: (number | null)[] = sections.map(() => null);
  const order = sections.map((_, i) => i);
  for (const slots of Object.values(slotsByLabel)) {
    if (slots.length < 2 && sections[slots[0]].explicitNum === null) continue;

    const claimed = new Set<number>();
    for (const i of slots) {
      const n = sections[i].explicitNum;
      if (n !== null && !claimed.has(n)) {
        resolvedNumbers[i] = n;
        claimed.add(n);
      }
    }
    let next = 1;
    for (const i of slots) {
      if (resolvedNumbers[i] !== null) continue;
      while (claimed.has(next)) next++;
      resolvedNumbers[i] = next;
      claimed.add(next++);
    }

    // Reorder: each slot (by document position) takes the content whose
    // resolved number matches that slot's rank, so the group ends up sorted
    // ascending while sections of other labels keep their own position.
    const sortedByNumber = [...slots].sort(
      (a, b) => resolvedNumbers[a]! - resolvedNumbers[b]!,
    );
    slots.forEach((slot, rank) => (order[slot] = sortedByNumber[rank]));
  }

  const slides: Slide[] = [];
  order.forEach((srcIndex) => {
    const section = sections[srcIndex];
    const num = resolvedNumbers[srcIndex];
    const numbered =
      num !== null ? `${section.baseLabel} ${num}` : section.baseLabel;
    const chunks = chunkLines(section.lines, maxLines);
    chunks.forEach((lines, i) => {
      const label =
        chunks.length > 1
          ? `${numbered} · ${i + 1}/${chunks.length}`
          : numbered;
      slides.push({
        id: uid(),
        type: section.type,
        label,
        lines,
        overrides: {},
        notes: "",
      });
    });
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
  return slides;
}
