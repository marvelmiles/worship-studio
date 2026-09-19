import type { TextStyle } from "../types";

export const SLIDE_ASPECT = 16 / 9;

/**
 * The slide canvas is measured in cqw, so a 16:9 frame is this many cqw tall.
 * Every figure below is in the same unit, which is what makes the capacity
 * arithmetic work without knowing the projector's pixel size.
 */
export const SLIDE_HEIGHT_CQW = 100 / SLIDE_ASPECT;

export const SLIDE_BODY_PADDING_Y_CQW = 7;
export const SLIDE_BODY_PADDING_X_CQW = 9;

/**
 * Air kept above and below the words on top of the body padding, so a slide
 * reads as a framed line of text rather than a block pressed against the edges.
 */
export const SLIDE_BREATHING_ROOM_CQW = 3;

export const SLIDE_BODY_PADDING = `${SLIDE_BODY_PADDING_Y_CQW}cqw ${SLIDE_BODY_PADDING_X_CQW}cqw`;

export const DEFAULT_SLIDE_FONT_SIZE = 6;
export const DEFAULT_SLIDE_LINE_HEIGHT = 1.25;

export const MIN_SLIDE_FONT_SIZE = 2.5;
export const MAX_SLIDE_FONT_SIZE = 10;

/**
 * Mixed-case English text averages about half the font size per glyph across
 * the faces this app ships, which is close enough to predict where a line wraps
 * without laying it out first.
 */
const AVERAGE_GLYPH_WIDTH_RATIO = 0.5;

const TEXT_AREA_HEIGHT_CQW =
  SLIDE_HEIGHT_CQW - 2 * (SLIDE_BODY_PADDING_Y_CQW + SLIDE_BREATHING_ROOM_CQW);

const TEXT_AREA_WIDTH_CQW = 100 - 2 * SLIDE_BODY_PADDING_X_CQW;

export interface SlideTextMetrics {
  fontSize: number;
  lineHeight: number;
}

export const DEFAULT_SLIDE_TEXT_METRICS: SlideTextMetrics = {
  fontSize: DEFAULT_SLIDE_FONT_SIZE,
  lineHeight: DEFAULT_SLIDE_LINE_HEIGHT,
};

export const slideTextMetrics = (
  style?: Pick<TextStyle, "fontSize" | "lineHeight"> | null,
): SlideTextMetrics => ({
  fontSize: style?.fontSize || DEFAULT_SLIDE_FONT_SIZE,
  lineHeight: style?.lineHeight || DEFAULT_SLIDE_LINE_HEIGHT,
});

export const sameSlideTextMetrics = (
  a: SlideTextMetrics,
  b: SlideTextMetrics,
): boolean => a.fontSize === b.fontSize && a.lineHeight === b.lineHeight;

/** How many rendered rows of text fit on a slide at this size. */
export const slideRowCapacity = (metrics: SlideTextMetrics): number =>
  Math.max(
    1,
    Math.floor(TEXT_AREA_HEIGHT_CQW / (metrics.fontSize * metrics.lineHeight)),
  );

/** How many characters fit on one rendered row at this size. */
export const slideRowCharacters = (metrics: SlideTextMetrics): number =>
  Math.max(
    8,
    Math.floor(
      TEXT_AREA_WIDTH_CQW / (metrics.fontSize * AVERAGE_GLYPH_WIDTH_RATIO),
    ),
  );

/** How many rows one written line takes once it wraps. */
export const slideRowsForText = (
  text: string,
  metrics: SlideTextMetrics,
): number =>
  Math.max(1, Math.ceil(text.trim().length / slideRowCharacters(metrics)));

/** How many characters a whole slide holds, minus any rows already spoken for. */
export const slideCharacterBudget = (
  metrics: SlideTextMetrics,
  reservedRows = 0,
): number =>
  Math.max(1, slideRowCapacity(metrics) - reservedRows) *
  slideRowCharacters(metrics);

export interface SlideFitOptions {
  /** A hard cap on written lines per slide, on top of the height budget. */
  maxLines?: number;
  /** Rows a slide spends on something other than this text, such as a reference. */
  reservedRows?: number;
}

/**
 * Groups items into slide-sized runs: a run closes as soon as one more item
 * would push the text past the rows a slide can show with room to breathe.
 */
export const chunkToFit = <T>(
  items: T[],
  textOf: (item: T) => string,
  metrics: SlideTextMetrics,
  options: SlideFitOptions = {},
): T[][] => {
  const rowBudget = Math.max(
    1,
    slideRowCapacity(metrics) - (options.reservedRows ?? 0),
  );
  const lineBudget = Math.max(1, options.maxLines ?? rowBudget);

  const chunks: T[][] = [];
  let current: T[] = [];
  let rows = 0;

  const flush = () => {
    if (!current.length) return;
    chunks.push(current);
    current = [];
    rows = 0;
  };

  for (const item of items) {
    const cost = Math.min(slideRowsForText(textOf(item), metrics), rowBudget);
    if (
      current.length &&
      (rows + cost > rowBudget || current.length >= lineBudget)
    )
      flush();
    current.push(item);
    rows += cost;
  }
  flush();

  return chunks.length ? chunks : [[]];
};

export const chunkLinesToFit = (
  lines: string[],
  metrics: SlideTextMetrics,
  options: SlideFitOptions = {},
): string[][] => chunkToFit(lines, (line) => line, metrics, options);

export const slideLinesOverflow = (
  lines: string[],
  metrics: SlideTextMetrics,
  options: SlideFitOptions = {},
): boolean => chunkLinesToFit(lines, metrics, options).length > 1;

const CHUNK_SUFFIX = /\s·\s\d+\/\d+$/;

export const slideChunkBaseLabel = (label: string): string =>
  label.replace(CHUNK_SUFFIX, "");

export const slideChunkLabel = (
  base: string,
  index: number,
  total: number,
): string => (total > 1 ? `${base} · ${index + 1}/${total}` : base);
