import type { BibleVerse, BibleVersionId, PassageRange, Slide, TextStyle } from "../../../types";
import { uid } from "../../../lib/id";
import { formatRange, formatReference } from "./reference";

export interface ScriptureSlideOptions {
  version: BibleVersionId;
  range: PassageRange;
  verses: BibleVerse[];
  versesPerSlide: number;
  showVerseNumbers: boolean;
  showReference: boolean;
}

const REFERENCE_LINE_STYLE: TextStyle = { fontSize: 2.6, uppercase: false };

/**
 * Index of the slide that contains a verse number, mirroring the chunking
 * used by buildScriptureSlides. Returns -1 when the verse isn't in the passage.
 */
export function slideIndexForVerse(
  verses: BibleVerse[],
  versesPerSlide: number,
  verse: number
): number {
  const perSlide = Math.max(1, versesPerSlide);
  const pos = verses.findIndex((v) => v.v === verse);
  return pos < 0 ? -1 : Math.floor(pos / perSlide);
}

export function buildScriptureSlides(options: ScriptureSlideOptions): Slide[] {
  const { version, range, verses, versesPerSlide, showVerseNumbers, showReference } = options;
  const perSlide = Math.max(1, versesPerSlide);
  const slides: Slide[] = [];

  for (let start = 0; start < verses.length; start += perSlide) {
    const chunk = verses.slice(start, start + perSlide);
    const chunkRange: PassageRange = {
      ...range,
      verseStart: chunk[0].v,
      verseEnd: chunk[chunk.length - 1].v,
    };
    const lines = chunk.flatMap((verse) => {
      const verseLines = verse.t.split("\n");
      if (showVerseNumbers) {
        return verseLines.map((line, i) => (i === 0 ? `${verse.v}. ${line}` : line));
      }
      return verseLines;
    });
    const lineOverrides: Record<number, TextStyle> = {};
    if (showReference) {
      lines.push(formatReference(chunkRange, version));
      lineOverrides[lines.length - 1] = { ...REFERENCE_LINE_STYLE };
    }
    slides.push({
      id: uid(),
      type: "scripture",
      label: formatRange(chunkRange),
      lines,
      overrides: {},
      lineOverrides: showReference ? lineOverrides : undefined,
      notes: "",
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
