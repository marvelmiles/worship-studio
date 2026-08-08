import { applyInlineMark, isInlineMarkActive } from "./inlineEdit";
import type { EditResult } from "./inlineEdit";
import type { InlineMarkName } from "./inlineFormat";

/**
 * Word-processor style emphasis for the text editors.
 *
 * The document itself stays plain text: every mark is the same Markdown-ish
 * token the slide renderer already understands (see lib/inlineFormat.ts), so
 * text stays copy-pasteable and nothing depends on a rich-text data model. The
 * tokens are never written by hand though. A command rewrites the parsed runs
 * and lets the writer re-emit them (see lib/inlineEdit.ts), which is what keeps
 * the markers balanced and invisible: bolding a phrase makes it bold on the
 * slide rather than putting `**` on either side of it.
 */

export type InlineFormatName = InlineMarkName;

export interface InlineFormatDefinition {
  label: string;
  /** Letter that triggers it with Ctrl/Cmd held, matching Word's bindings. */
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

/**
 * True when the command would turn the mark off rather than on. Reported to the
 * toolbar so a button lights up while the caret sits in formatted text.
 */
export function isInlineFormatActive(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  name: InlineFormatName,
): boolean {
  return isInlineMarkActive(text, selectionStart, selectionEnd, name);
}

/** Adds the mark, or takes it away when everything covered already carries it. */
export function toggleInlineFormat(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  name: InlineFormatName,
): FormattingResult {
  return applyInlineMark(
    text,
    selectionStart,
    selectionEnd,
    name,
    !isInlineMarkActive(text, selectionStart, selectionEnd, name),
  );
}

/** Ctrl/Cmd + letter to command, so editors can share Word's bindings. */
export function inlineFormatForShortcut(
  key: string,
): InlineFormatName | undefined {
  const letter = key.toLowerCase();
  return INLINE_FORMAT_NAMES.find(
    (name) => INLINE_FORMATS[name].shortcutKey === letter,
  );
}
