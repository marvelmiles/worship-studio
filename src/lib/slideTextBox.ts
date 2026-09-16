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

export const TEXT_BOX_PADDING = "0.7cqw 1cqw";

const INSERTED_FRAME: SlideFrame = { x: 20, y: 36, width: 60, height: 24 };

export const SERMON_BODY_FRAME: SlideFrame = {
  x: 8,
  y: 11,
  width: 84,
  height: 78,
};

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

export const createSlideTextBox = (
  options: CreateTextBoxOptions = {},
): SlideTextBox => {
  return {
    id: uid(),
    frame: clampFrame(options.frame ?? INSERTED_FRAME),
    lines: options.lines?.length ? options.lines : [...DEFAULT_TEXT_BOX_LINES],
    verticalAlign: options.verticalAlign ?? "middle",
    lineOverrides: options.lineOverrides,
  };
};

export const textBoxStyle = (
  box: SlideTextBox,
  base: ResolvedStyle,
): ResolvedStyle => layerTextStyle(base, box.style);

export const textBoxLineStyles = (
  box: SlideTextBox,
  base: ResolvedStyle,
): ResolvedStyle[] => {
  const style = textBoxStyle(box, base);
  return box.lines.map((_, index) =>
    layerTextStyle(style, box.lineOverrides?.[index]),
  );
};

export interface SlideTextCarrier {
  boxId: string | null;
  lines: string[];
  lineOverrides?: Record<number, TextStyle>;
}

export const textCarrierOf = (slide: Slide): SlideTextCarrier => {
  const lines = slide.lines ?? [];
  if (lines.some((line) => line.trim() !== "") || !slide.textBoxes?.length)
    return { boxId: null, lines, lineOverrides: slide.lineOverrides };
  const box = slide.textBoxes[0];
  return {
    boxId: box.id,
    lines: box.lines,
    lineOverrides: box.lineOverrides,
  };
};

export const withCarrierText = (
  slide: Slide,
  carrier: SlideTextCarrier,
  lines: string[],
  lineOverrides?: Record<number, TextStyle>,
): Slide => {
  if (!carrier.boxId) return { ...slide, lines, lineOverrides };
  return {
    ...slide,
    textBoxes: (slide.textBoxes ?? []).map((box) =>
      box.id === carrier.boxId ? { ...box, lines, lineOverrides } : box,
    ),
  };
};

export interface ImportedSlideTextBox {
  id?: string;
  frame?: Partial<SlideFrame>;
  lines?: string[];
  verticalAlign?: VerticalAlign;
  style?: TextStyle;
  lineOverrides?: Record<string, TextStyle>;
}

const normalizeLineOverrides = (
  raw: Record<string, TextStyle> | undefined,
): Record<number, TextStyle> | undefined => {
  if (!raw) return undefined;
  const entries = Object.entries(raw).filter(([index]) =>
    Number.isInteger(Number(index)),
  );
  if (!entries.length) return undefined;
  return Object.fromEntries(
    entries.map(([index, style]) => [Number(index), style]),
  );
};

export const normalizeSlideTextBox = (
  raw: ImportedSlideTextBox,
): SlideTextBox => {
  return {
    id: raw.id || uid(),
    frame: clampFrame({ ...INSERTED_FRAME, ...raw.frame }),
    lines: raw.lines?.length ? raw.lines : [""],
    verticalAlign: raw.verticalAlign ?? "middle",
    style: raw.style,
    lineOverrides: normalizeLineOverrides(raw.lineOverrides),
  };
};
