import type {
  ResolvedStyle,
  Slide,
  SlideFrame,
  SlideTextBox,
  TextStyle,
  VerticalAlign,
} from "../types";
import { uid } from "./id";
import { layerTextStyle } from "./resolve";
import { clampFrame } from "./slideMedia";

/**
 * Text blocks placed on a slide the way a picture is: the writer drags them
 * where the layout needs them instead of the text always filling the slide.
 *
 * A box holds nothing but its lines and its own appearance. Everything it does
 * not set is inherited from the slide, the document and the theme, so restyling
 * a deck still reaches the text inside every box.
 */

/** Padding between a box's outline and its text, in slide-width units. */
export const TEXT_BOX_PADDING = "0.7cqw 1cqw";

/** Where a freshly inserted box lands: centred, with room to type into. */
const INSERTED_FRAME: SlideFrame = { x: 20, y: 36, width: 60, height: 24 };

/**
 * The frame a generated sermon body fills: the same margins the slide's own
 * text is painted with, so regenerating a deck does not move the words.
 */
export const SERMON_BODY_FRAME: SlideFrame = {
  x: 8,
  y: 11,
  width: 84,
  height: 78,
};

/** A sermon title slide breathes: its details sit in the middle of the slide. */
export const SERMON_TITLE_FRAME: SlideFrame = {
  x: 8,
  y: 20,
  width: 84,
  height: 60,
};

export const DEFAULT_TEXT_BOX_LINES = ["New text"];

export interface CreateTextBoxOptions {
  frame?: SlideFrame;
  lines?: string[];
  verticalAlign?: VerticalAlign;
  lineOverrides?: Record<number, TextStyle>;
}

export function createSlideTextBox(
  options: CreateTextBoxOptions = {},
): SlideTextBox {
  return {
    id: uid(),
    frame: clampFrame(options.frame ?? INSERTED_FRAME),
    lines: options.lines?.length ? options.lines : [...DEFAULT_TEXT_BOX_LINES],
    verticalAlign: options.verticalAlign ?? "middle",
    lineOverrides: options.lineOverrides,
  };
}

/** The style the box paints in: the slide's resolved style with its own on top. */
export const textBoxStyle = (
  box: SlideTextBox,
  base: ResolvedStyle,
): ResolvedStyle => layerTextStyle(base, box.style);

/** One resolved style per line, the way the slide's own text is painted. */
export const textBoxLineStyles = (
  box: SlideTextBox,
  base: ResolvedStyle,
): ResolvedStyle[] => {
  const style = textBoxStyle(box, base);
  return box.lines.map((_, index) =>
    layerTextStyle(style, box.lineOverrides?.[index]),
  );
};

/**
 * Where a slide keeps the text a reader would call its body: its own lines, or
 * the first box holding any once the lines are empty. Splitting and merging act
 * on it, so those commands work the same whether a deck was built as lyrics or
 * as a sermon.
 */
export interface SlideTextCarrier {
  /** null when the slide's own lines carry the text. */
  boxId: string | null;
  lines: string[];
  lineOverrides?: Record<number, TextStyle>;
}

export function textCarrierOf(slide: Slide): SlideTextCarrier {
  const lines = slide.lines ?? [];
  if (lines.some((line) => line.trim() !== "") || !slide.textBoxes?.length)
    return { boxId: null, lines, lineOverrides: slide.lineOverrides };
  const box = slide.textBoxes[0];
  return {
    boxId: box.id,
    lines: box.lines,
    lineOverrides: box.lineOverrides,
  };
}

/** Writes lines back into whichever carrier they came from. */
export function withCarrierText(
  slide: Slide,
  carrier: SlideTextCarrier,
  lines: string[],
  lineOverrides?: Record<number, TextStyle>,
): Slide {
  if (!carrier.boxId) return { ...slide, lines, lineOverrides };
  return {
    ...slide,
    textBoxes: (slide.textBoxes ?? []).map((box) =>
      box.id === carrier.boxId ? { ...box, lines, lineOverrides } : box,
    ),
  };
}

/** A box as a backup may carry it, with everything optional. */
export interface ImportedSlideTextBox {
  id?: string;
  frame?: Partial<SlideFrame>;
  lines?: string[];
  verticalAlign?: VerticalAlign;
  style?: TextStyle;
  /** JSON only ever has string keys, whatever the record was written from. */
  lineOverrides?: Record<string, TextStyle>;
}

/** Rebuilds the line map under the numeric keys the rest of the app indexes by. */
function normalizeLineOverrides(
  raw: Record<string, TextStyle> | undefined,
): Record<number, TextStyle> | undefined {
  if (!raw) return undefined;
  const entries = Object.entries(raw).filter(([index]) =>
    Number.isInteger(Number(index)),
  );
  if (!entries.length) return undefined;
  return Object.fromEntries(
    entries.map(([index, style]) => [Number(index), style]),
  );
}

export function normalizeSlideTextBox(raw: ImportedSlideTextBox): SlideTextBox {
  return {
    id: raw.id || uid(),
    frame: clampFrame({ ...INSERTED_FRAME, ...raw.frame }),
    lines: raw.lines?.length ? raw.lines : [""],
    verticalAlign: raw.verticalAlign ?? "middle",
    style: raw.style,
    lineOverrides: normalizeLineOverrides(raw.lineOverrides),
  };
}
