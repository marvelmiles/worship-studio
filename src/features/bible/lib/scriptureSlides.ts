import type {
  BibleVerse,
  BibleVersionId,
  PassageRange,
  Slide,
  TextStyle,
} from "../../../types";
import { uid } from "../../../lib/id";
import { splitTextIntoParts } from "../../../lib/textBlocks";
import { SCRIPTURE_REFERENCE_FONT_SIZE } from "../../../data/themes";
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

const REFERENCE_LINE_STYLE: TextStyle = {
  fontSize: SCRIPTURE_REFERENCE_FONT_SIZE,
  uppercase: false,
};

/**
 * Character budget for one slide before splitting kicks in. At the default
 * scripture size (6.7cqw, ~24 chars per wrapped line) this keeps a slide to
 * roughly three wrapped lines plus the reference, leaving clear space above
 * and below the text on the stage.
 */
const MAX_SLIDE_CHARS = 90;

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
