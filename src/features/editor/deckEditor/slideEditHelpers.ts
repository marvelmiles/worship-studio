import type {
  Slide,
  SlideElementKind,
  SlideFrame,
  TextStyle,
} from "../../../types";
import { uid } from "../../../lib/id";
import type { TextRange } from "../../../lib/textRange";

export type SlideListKey = "media" | "textBoxes";

export interface PlacedElement {
  id: string;
  frame: SlideFrame;
}

export interface EditOptions {
  caret?: TextRange | null;
  /** Edits sharing a key within the coalesce window collapse into one undo step. */
  coalesceKey?: string;
}

export const HISTORY_LIMIT = 200;
export const COALESCE_MS = 600;
export const DUPLICATE_OFFSET = 3;

export const blankSlide = (): Slide => ({
  id: uid(),
  type: "verse",
  label: "New Slide",
  lines: ["New line"],
  overrides: {},
  notes: "",
});

export const listKeyFor = (kind: SlideElementKind): SlideListKey =>
  kind === "text" ? "textBoxes" : "media";

export const withStyleKey = (
  style: TextStyle | undefined,
  key: string,
  value: unknown,
): TextStyle => {
  const next = { ...(style ?? {}) } as Record<string, unknown>;
  if (value === "" || value == null) delete next[key];
  else next[key] = value;
  return next as TextStyle;
};

export const withLineStyleKey = (
  lineOverrides: Record<number, TextStyle> | undefined,
  lineIndexes: number[],
  key: string,
  value: unknown,
): Record<number, TextStyle> => {
  const next = { ...(lineOverrides ?? {}) };
  for (const lineIndex of lineIndexes) {
    const line = withStyleKey(next[lineIndex], key, value);
    if (Object.keys(line).length) next[lineIndex] = line;
    else delete next[lineIndex];
  }
  return next;
};

export const trimLineOverrides = (
  lineOverrides: Record<number, TextStyle> | undefined,
  lineCount: number,
): Record<number, TextStyle> | undefined =>
  lineOverrides
    ? Object.fromEntries(
        Object.entries(lineOverrides).filter(
          ([index]) => Number(index) < lineCount,
        ),
      )
    : undefined;

export const dropLineOverride = (
  lineOverrides: Record<number, TextStyle> | undefined,
  lineIndex: number,
): Record<number, TextStyle> | undefined => {
  if (!lineOverrides) return undefined;
  const next = { ...lineOverrides };
  delete next[lineIndex];
  return next;
};
