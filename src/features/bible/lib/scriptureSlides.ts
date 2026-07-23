import type {
  BibleVerse,
  BibleVersionId,
  PassageRange,
  Slide,
  TextStyle,
} from "../../../types";
import { uid } from "../../../lib/id";
import { formatRange, formatReference } from "./reference";

export interface ScriptureSlideOptions {
  version: BibleVersionId;
  range: PassageRange;
  verses: BibleVerse[];
  versesPerSlide: number;
  showVerseNumbers: boolean;
  showReference: boolean;
  /**
   * Break slides whose text would overflow the stage into multiple slides.
   * Used by quick presents, where the user never tunes verses-per-slide.
   */
  splitLongVerses?: boolean;
}

const REFERENCE_LINE_STYLE: TextStyle = { fontSize: 2.6, uppercase: false };

/**
 * Character budget for one slide before splitting kicks in. At the default
 * scripture theme (4.4cqw, ~37 chars per wrapped line) this keeps a slide to
 * roughly five wrapped lines plus the reference, leaving clear space above
 * and below the text on the stage.
 */
const MAX_SLIDE_CHARS = 190;

/** Display lines for a chunk of verses, before the reference line is added. */
function chunkLines(chunk: BibleVerse[], showVerseNumbers: boolean): string[] {
  return chunk.flatMap((verse) => {
    const verseLines = verse.t.split("\n");
    if (showVerseNumbers) {
      return verseLines.map((line, i) =>
        i === 0 ? `${verse.v}. ${line}` : line,
      );
    }
    return verseLines;
  });
}

/**
 * Splits text into `count` roughly equal parts at word boundaries, nudging
 * each break toward the nearest sentence punctuation so parts read naturally.
 * Every break lands as close as possible to an even division of the text.
 */
function splitTextIntoParts(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  const count = Math.ceil(text.length / maxChars);
  const words = text.split(/\s+/).filter(Boolean);

  // Word boundaries as cumulative character positions (position after word i).
  const bounds: { pos: number; index: number; punct: boolean }[] = [];
  let pos = 0;
  words.forEach((word, i) => {
    pos += (i === 0 ? 0 : 1) + word.length;
    bounds.push({ pos, index: i, punct: /[,;:.!?]$/.test(word) });
  });

  const total = text.length;
  const chosen: number[] = []; // word indices after which we break
  for (let k = 1; k < count; k++) {
    const ideal = (total * k) / count;
    const prev = chosen.length ? chosen[chosen.length - 1] : -1;
    let best = -1;
    let bestScore = Infinity;
    for (const b of bounds) {
      if (b.index <= prev || b.index >= words.length - 1) continue;
      // Distance from the ideal split point, with a discount for breaking
      // right after punctuation so natural pauses win close calls.
      const score = Math.abs(b.pos - ideal) - (b.punct ? maxChars * 0.15 : 0);
      if (score < bestScore) {
        bestScore = score;
        best = b.index;
      }
    }
    if (best >= 0) chosen.push(best);
  }

  const parts: string[] = [];
  let start = 0;
  for (const breakIdx of chosen) {
    parts.push(words.slice(start, breakIdx + 1).join(" "));
    start = breakIdx + 1;
  }
  parts.push(words.slice(start).join(" "));
  return parts.filter(Boolean);
}

/** Per-slide line groups for one chunk: a single group, or split parts. */
function chunkParts(lines: string[], split: boolean): string[][] {
  const text = lines.join(" ");
  if (!split || text.length <= MAX_SLIDE_CHARS) return [lines];
  return splitTextIntoParts(text, MAX_SLIDE_CHARS).map((part) => [part]);
}

/**
 * Index of the slide that contains a verse number, mirroring the chunking
 * and long-verse splitting used by buildScriptureSlides. Returns -1 when
 * the verse isn't in the passage.
 */
export function slideIndexForVerse(
  passage: Pick<
    ScriptureSlideOptions,
    "verses" | "versesPerSlide" | "showVerseNumbers"
  > & {
    quick?: boolean;
  },
  verse: number,
): number {
  const { verses, showVerseNumbers } = passage;
  const perSlide = Math.max(1, passage.versesPerSlide);
  const split = Boolean(passage.quick);
  let index = 0;
  for (let start = 0; start < verses.length; start += perSlide) {
    const chunk = verses.slice(start, start + perSlide);
    if (chunk.some((v) => v.v === verse)) return index;
    index += chunkParts(chunkLines(chunk, showVerseNumbers), split).length;
  }
  return -1;
}

export function buildScriptureSlides(options: ScriptureSlideOptions): Slide[] {
  const {
    version,
    range,
    verses,
    versesPerSlide,
    showVerseNumbers,
    showReference,
  } = options;
  const perSlide = Math.max(1, versesPerSlide);
  const slides: Slide[] = [];

  for (let start = 0; start < verses.length; start += perSlide) {
    const chunk = verses.slice(start, start + perSlide);
    const chunkRange: PassageRange = {
      ...range,
      verseStart: chunk[0].v,
      verseEnd: chunk[chunk.length - 1].v,
    };
    const parts = chunkParts(
      chunkLines(chunk, showVerseNumbers),
      Boolean(options.splitLongVerses),
    );
    parts.forEach((partLines, p) => {
      const lines = [...partLines];
      const lineOverrides: Record<number, TextStyle> = {};
      if (showReference) {
        lines.push(formatReference(chunkRange, version));
        lineOverrides[lines.length - 1] = { ...REFERENCE_LINE_STYLE };
      }
      const label =
        parts.length > 1
          ? `${formatRange(chunkRange)} (${p + 1}/${parts.length})`
          : formatRange(chunkRange);
      slides.push({
        id: uid(),
        type: "scripture",
        label,
        lines,
        overrides: {},
        lineOverrides: showReference ? lineOverrides : undefined,
        notes: "",
      });
    });
  }

  if (!slides.length) {
    slides.push({
      id: uid(),
      type: "scripture",
      label: formatRange(range),
      lines: ["(no verses)"],
      overrides: {},
      notes: "",
    });
  }
  return slides;
}
