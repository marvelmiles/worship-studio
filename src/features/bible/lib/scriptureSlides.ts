import type {
  BibleVerse,
  BibleVersionId,
  PassageRange,
  Slide,
  TextStyle,
} from "../../../types";
import { uid } from "../../../lib/id";
import { splitTextIntoParts } from "../../../lib/textBlocks";
import {
  slideCharacterBudget,
  slideChunkLabel,
  slideTextMetrics,
  type SlideTextMetrics,
} from "../../../lib/slideLayout";
import { SCRIPTURE_REFERENCE_FONT_SIZE } from "../../../data/themes";
import { formatRange, formatReference } from "./reference";

export interface ScriptureSlideOptions {
  version: BibleVersionId;
  range: PassageRange;
  verses: BibleVerse[];
  versesPerSlide: number;
  showVerseNumbers: boolean;
  showReference: boolean;
  splitLongVerses?: boolean;
  /** The passage's resolved text style, which decides how much fits on a slide. */
  style?: Pick<TextStyle, "fontSize" | "lineHeight"> | null;
}

const REFERENCE_LINE_STYLE: TextStyle = {
  fontSize: SCRIPTURE_REFERENCE_FONT_SIZE,
  uppercase: false,
};

/**
 * A passage slide spends one row on its reference, so the verse itself gets
 * whatever is left once the slide has kept its space top and bottom.
 */
const slideCharacters = (
  metrics: SlideTextMetrics,
  showReference: boolean,
): number => slideCharacterBudget(metrics, showReference ? 1 : 0);

const chunkLines = (
  chunk: BibleVerse[],
  showVerseNumbers: boolean,
): string[] => {
  return chunk.flatMap((verse) => {
    const verseLines = verse.t.split("\n");
    if (showVerseNumbers) {
      return verseLines.map((line, i) =>
        i === 0 ? `${verse.v}. ${line}` : line,
      );
    }
    return verseLines;
  });
};

const chunkParts = (
  lines: string[],
  split: boolean,
  budget: number,
): string[][] => {
  const text = lines.join(" ");
  if (text.length <= budget) return [lines];
  /* A passage that was never meant to be re-cut still has to fit, so an
     oversized verse is split either way; the flag only decides whether short
     ones are broken up as well. */
  if (!split && lines.length > 1) return [lines];
  return splitTextIntoParts(text, budget).map((part) => [part]);
};

export const slideIndexForVerse = (
  passage: Pick<
    ScriptureSlideOptions,
    "verses" | "versesPerSlide" | "showVerseNumbers" | "showReference" | "style"
  > & {
    quick?: boolean;
  },
  verse: number,
): number => {
  const { verses, showVerseNumbers } = passage;
  const perSlide = Math.max(1, passage.versesPerSlide);
  const split = Boolean(passage.quick);
  const budget = slideCharacters(
    slideTextMetrics(passage.style),
    passage.showReference !== false,
  );
  let index = 0;
  for (let start = 0; start < verses.length; start += perSlide) {
    const chunk = verses.slice(start, start + perSlide);
    if (chunk.some((v) => v.v === verse)) return index;
    index += chunkParts(
      chunkLines(chunk, showVerseNumbers),
      split,
      budget,
    ).length;
  }
  return -1;
};

export const buildScriptureSlides = (
  options: ScriptureSlideOptions,
): Slide[] => {
  const {
    version,
    range,
    verses,
    versesPerSlide,
    showVerseNumbers,
    showReference,
  } = options;
  const perSlide = Math.max(1, versesPerSlide);
  const budget = slideCharacters(
    slideTextMetrics(options.style),
    showReference,
  );
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
      budget,
    );
    const flowId = uid();
    parts.forEach((partLines, p) => {
      const lines = [...partLines];
      const lineOverrides: Record<number, TextStyle> = {};
      if (showReference) {
        lines.push(formatReference(chunkRange, version));
        lineOverrides[lines.length - 1] = { ...REFERENCE_LINE_STYLE };
      }
      const label = slideChunkLabel(formatRange(chunkRange), p, parts.length);
      slides.push({
        id: uid(),
        type: "scripture",
        flowId,
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
};
