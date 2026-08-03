import { stripInlineFormatting } from "./inlineFormat";
import { prefixLength } from "./lists";
import { resolveRange } from "./textRange";
import type { EditResult } from "./inlineEdit";

/**
 * Word-processor style formatting for the plain-text editors. The document
 * itself stays plain text: every mark is the same Markdown-ish token the slide
 * renderer already understands (see lib/inlineFormat.ts), so text stays
 * copy-pasteable and nothing depends on a rich-text data model.
 */

export type InlineFormatName =
  "bold" | "italic" | "underline" | "strikethrough" | "highlight";

export interface InlineFormatDefinition {
  token: string;
  label: string;
  /** Letter that triggers it with Ctrl/Cmd held, matching Word's bindings. */
  shortcutKey?: string;
  shortcutHint: string;
}

export const INLINE_FORMATS: Record<InlineFormatName, InlineFormatDefinition> =
  {
    bold: {
      token: "**",
      label: "Bold",
      shortcutKey: "b",
      shortcutHint: "Ctrl+B",
    },
    italic: {
      token: "*",
      label: "Italic",
      shortcutKey: "i",
      shortcutHint: "Ctrl+I",
    },
    underline: {
      token: "++",
      label: "Underline",
      shortcutKey: "u",
      shortcutHint: "Ctrl+U",
    },
    strikethrough: {
      token: "~~",
      label: "Strikethrough",
      shortcutKey: "d",
      shortcutHint: "Ctrl+D",
    },
    highlight: {
      token: "==",
      label: "Highlight",
      shortcutKey: "h",
      shortcutHint: "Ctrl+H",
    },
  };

export const INLINE_FORMAT_NAMES = Object.keys(
  INLINE_FORMATS,
) as InlineFormatName[];

export type FormattingResult = EditResult;

interface SplitLine {
  lead: string;
  core: string;
  trail: string;
}

/** A list marker belongs to the line, not to the words, so marks go around it. */
function splitLine(line: string): SplitLine {
  const lead = line.slice(0, prefixLength(line));
  const trail = line.slice(lead.length).match(/\s*$/)?.[0] ?? "";
  return {
    lead,
    core: line.slice(lead.length, line.length - trail.length),
    trail,
  };
}

const isWrapped = (core: string, token: string): boolean =>
  core.length > token.length * 2 &&
  core.startsWith(token) &&
  core.endsWith(token);

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
  const range = resolveRange(text, selectionStart, selectionEnd);
  if (!range) return false;
  const { token } = INLINE_FORMATS[name];
  const middle = text.slice(range.start, range.end);

  if (
    !middle.includes("\n") &&
    text.slice(0, range.start).endsWith(token) &&
    text.slice(range.end).startsWith(token)
  )
    return true;

  const filled = middle.split("\n").filter((line) => line.trim() !== "");
  return (
    filled.length > 0 &&
    filled.every((line) => isWrapped(splitLine(line).core, token))
  );
}

/**
 * Adds the mark, or takes it away when it is already there. Marks never span a
 * line break (each slide line is parsed on its own), so a multi-line selection
 * is wrapped line by line and blank lines are left alone.
 */
export function toggleInlineFormat(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  name: InlineFormatName,
): FormattingResult {
  const unchanged = { text, selectionStart, selectionEnd };
  const range = resolveRange(text, selectionStart, selectionEnd);
  if (!range) return unchanged;

  const { token } = INLINE_FORMATS[name];
  const before = text.slice(0, range.start);
  const middle = text.slice(range.start, range.end);
  const after = text.slice(range.end);

  // The selection is the inside of an existing pair, e.g. **|word|**.
  if (
    !middle.includes("\n") &&
    before.endsWith(token) &&
    after.startsWith(token)
  ) {
    return {
      text: before.slice(0, -token.length) + middle + after.slice(token.length),
      selectionStart: range.start - token.length,
      selectionEnd: range.end - token.length,
    };
  }

  const lines = middle.split("\n");
  const filled = lines.filter((line) => line.trim() !== "");
  const removing =
    filled.length > 0 &&
    filled.every((line) => isWrapped(splitLine(line).core, token));

  const formatted = lines
    .map((line) => {
      if (!line.trim()) return line;
      const { lead, core, trail } = splitLine(line);
      const next = removing
        ? core.slice(token.length, core.length - token.length)
        : `${token}${core}${token}`;
      return lead + next + trail;
    })
    .join("\n");

  return {
    text: before + formatted + after,
    selectionStart: range.start,
    selectionEnd: range.start + formatted.length,
  };
}

/** Strips every mark from the range, the "Clear formatting" command. */
export function clearInlineFormatting(
  text: string,
  selectionStart: number,
  selectionEnd: number,
): FormattingResult {
  const unchanged = { text, selectionStart, selectionEnd };
  const range = resolveRange(text, selectionStart, selectionEnd);
  if (!range) return unchanged;

  const cleared = text
    .slice(range.start, range.end)
    .split("\n")
    .map(stripInlineFormatting)
    .join("\n");

  return {
    text: text.slice(0, range.start) + cleared + text.slice(range.end),
    selectionStart: range.start,
    selectionEnd: range.start + cleared.length,
  };
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
