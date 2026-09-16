import { applyInlineMark, isInlineMarkActive } from "./inlineEdit";
import type { EditResult } from "./inlineEdit";
import type { InlineMarkName } from "./inlineFormat";

export type InlineFormatName = InlineMarkName;

export interface InlineFormatDefinition {
  label: string;
  shortcutKey: string;
  shortcutHint: string;
}

export const INLINE_FORMATS: Record<InlineFormatName, InlineFormatDefinition> =
  {
    bold: { label: "Bold", shortcutKey: "b", shortcutHint: "Ctrl+B" },
    italic: { label: "Italic", shortcutKey: "i", shortcutHint: "Ctrl+I" },
    underline: {
      label: "Underline",
      shortcutKey: "u",
      shortcutHint: "Ctrl+U",
    },
    strikethrough: {
      label: "Strikethrough",
      shortcutKey: "d",
      shortcutHint: "Ctrl+D",
    },
    highlight: {
      label: "Highlight",
      shortcutKey: "h",
      shortcutHint: "Ctrl+H",
    },
  };

export const INLINE_FORMAT_NAMES = Object.keys(
  INLINE_FORMATS,
) as InlineFormatName[];

export type FormattingResult = EditResult;

export { clearInlineFormatting } from "./inlineEdit";

export const isInlineFormatActive = (
  text: string,
  selectionStart: number,
  selectionEnd: number,
  name: InlineFormatName,
): boolean => {
  return isInlineMarkActive(text, selectionStart, selectionEnd, name);
};

export const toggleInlineFormat = (
  text: string,
  selectionStart: number,
  selectionEnd: number,
  name: InlineFormatName,
): FormattingResult => {
  return applyInlineMark(
    text,
    selectionStart,
    selectionEnd,
    name,
    !isInlineMarkActive(text, selectionStart, selectionEnd, name),
  );
};

export const inlineFormatForShortcut = (
  key: string,
): InlineFormatName | undefined => {
  const letter = key.toLowerCase();
  return INLINE_FORMAT_NAMES.find(
    (name) => INLINE_FORMATS[name].shortcutKey === letter,
  );
};
