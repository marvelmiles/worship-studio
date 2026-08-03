import {
  MARKER_TOKENS,
  parseInlineSegments,
  WORD_BOUNDARY_TOKENS,
} from "./inlineFormat";
import type { FormattedSegment, SourceSegment } from "./inlineFormat";
import {
  INLINE_STYLE_KEYS,
  openingToken,
  SPAN_CLOSE,
  SPAN_OPEN,
} from "./inlineStyle";
import type { InlineStyleKey, InlineTextStyle } from "./inlineStyle";
import { lineBounds, resolveRange } from "./textRange";
import type { TextRange } from "./textRange";

/**
 * Rewrites slide text from parsed segments.
 *
 * Applying a font or colour to a highlighted phrase is not a string insertion:
 * the run may already carry marks, may sit inside another styled span, and may
 * only partly overlap one. So a command parses the line, edits the segments,
 * and writes the line back out. Everything stays plain text, and the caret is
 * carried across because the writer reports where each segment landed.
 */

export interface EditResult {
  text: string;
  selectionStart: number;
  selectionEnd: number;
}

interface MarkToken {
  key: keyof FormattedSegment;
  token: string;
}

/** Nesting order, so bold + italic always writes the `***…***` form. */
const MARK_TOKENS: MarkToken[] = [
  { key: "bold", token: "**" },
  { key: "italic", token: "*" },
  { key: "underline", token: "++" },
  { key: "strikethrough", token: "~~" },
  { key: "highlight", token: "==" },
];

const WORD_CHARACTER = /[\p{L}\p{N}]/u;

const styleSignature = (style: InlineTextStyle | undefined): string =>
  openingToken(style) ?? "";

const markSignature = (segment: FormattedSegment): string =>
  MARK_TOKENS.filter(({ key }) => segment[key])
    .map(({ token }) => token)
    .join("");

/**
 * True when a character would be read back as a marker. Word-boundary tokens
 * only need escaping where they could actually open, so an underscore inside
 * file_name survives untouched.
 */
function needsEscape(text: string, index: number): boolean {
  const char = text[index];
  if (char === "\\") return true;
  if (text.startsWith(SPAN_OPEN, index)) return true;
  for (const token of MARKER_TOKENS) {
    if (!text.startsWith(token, index)) continue;
    if (!WORD_BOUNDARY_TOKENS.includes(token)) return true;
    return !WORD_CHARACTER.test(text[index - 1] ?? "");
  }
  return false;
}

function escapeText(text: string): string {
  let out = "";
  for (let index = 0; index < text.length; index += 1) {
    if (needsEscape(text, index)) out += "\\";
    out += text[index];
  }
  return out;
}

interface WrittenText {
  text: string;
  /** Where each segment's own text landed in the output. */
  ranges: TextRange[];
}

/**
 * Serialises segments back to plain text, grouping by style span first and by
 * emphasis second so neighbouring runs share one set of tokens.
 */
export function writeInlineSegments(segments: FormattedSegment[]): WrittenText {
  const ranges: TextRange[] = segments.map(() => ({ start: 0, end: 0 }));
  let text = "";

  let index = 0;
  while (index < segments.length) {
    const span = styleSignature(segments[index].style);
    let spanEnd = index;
    while (
      spanEnd < segments.length &&
      styleSignature(segments[spanEnd].style) === span
    )
      spanEnd += 1;

    if (span) text += span;

    let cursor = index;
    while (cursor < spanEnd) {
      const marks = markSignature(segments[cursor]);
      let runEnd = cursor;
      while (runEnd < spanEnd && markSignature(segments[runEnd]) === marks)
        runEnd += 1;

      const opening = MARK_TOKENS.filter(({ key }) => segments[cursor][key]);
      text += opening.map(({ token }) => token).join("");
      for (let i = cursor; i < runEnd; i += 1) {
        const start = text.length;
        text += escapeText(segments[i].text);
        ranges[i] = { start, end: text.length };
      }
      text += opening
        .map(({ token }) => token)
        .reverse()
        .join("");
      cursor = runEnd;
    }

    if (span) text += SPAN_CLOSE;
    index = spanEnd;
  }

  return { text, ranges };
}

/** Splits the segment holding `offset` so a boundary falls between segments. */
function splitAt(segments: SourceSegment[], offset: number): SourceSegment[] {
  const out: SourceSegment[] = [];
  for (const segment of segments) {
    const isPlain =
      segment.sourceEnd - segment.sourceStart === segment.text.length;
    if (
      !isPlain ||
      offset <= segment.sourceStart ||
      offset >= segment.sourceEnd
    ) {
      out.push(segment);
      continue;
    }
    const cut = offset - segment.sourceStart;
    out.push(
      { ...segment, text: segment.text.slice(0, cut), sourceEnd: offset },
      { ...segment, text: segment.text.slice(cut), sourceStart: offset },
    );
  }
  return out;
}

const patchStyle = (
  style: InlineTextStyle | undefined,
  key: InlineStyleKey,
  value: unknown,
): InlineTextStyle | undefined => {
  const next = { ...(style ?? {}) } as Record<string, unknown>;
  if (value === "" || value === null || value === undefined) delete next[key];
  else next[key] = value;
  return Object.keys(next).length ? (next as InlineTextStyle) : undefined;
};

interface LineEdit {
  text: string;
  /** Range of the edited run in the rewritten line. */
  start: number;
  end: number;
}

function applyToLine(
  line: string,
  from: number,
  to: number,
  key: InlineStyleKey,
  value: unknown,
): LineEdit {
  let segments = parseInlineSegments(line);
  segments = splitAt(segments, from);
  segments = splitAt(segments, to);

  const covered: number[] = [];
  const edited = segments.map((segment, index) => {
    if (segment.sourceStart < from || segment.sourceEnd > to) return segment;
    covered.push(index);
    return { ...segment, style: patchStyle(segment.style, key, value) };
  });
  if (!covered.length) return { text: line, start: from, end: to };

  const { text, ranges } = writeInlineSegments(edited);
  return {
    text,
    start: ranges[covered[0]].start,
    end: ranges[covered[covered.length - 1]].end,
  };
}

/**
 * Applies one character-level property to the highlighted text, or to the word
 * under a collapsed caret. Each line is rewritten on its own, because a mark
 * never spans a line break in slide text.
 */
export function applyInlineStyle(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  key: InlineStyleKey,
  value: unknown,
): EditResult {
  const unchanged = { text, selectionStart, selectionEnd };
  const range = resolveRange(text, selectionStart, selectionEnd);
  if (!range) return unchanged;

  const bounds = lineBounds(text);
  const lines = text.split("\n");
  let start: number | null = null;
  let end = 0;
  let offset = 0;

  const rewritten = lines.map((line, index) => {
    const bound = bounds[index];
    const from = Math.max(0, Math.min(line.length, range.start - bound.start));
    const to = Math.max(0, Math.min(line.length, range.end - bound.start));
    if (from >= to || !line.trim()) {
      offset += line.length + 1;
      return line;
    }
    const edit = applyToLine(line, from, to, key, value);
    if (start === null) start = offset + edit.start;
    end = offset + edit.end;
    offset += edit.text.length + 1;
    return edit.text;
  });

  const next = rewritten.join("\n");
  if (next === text) return unchanged;
  return {
    text: next,
    selectionStart: start ?? range.start,
    selectionEnd: end,
  };
}

/**
 * The character-level style in force across the whole selection. A property
 * only appears when every covered run agrees on it, the way a word processor
 * leaves a mixed selection's font box blank.
 */
export function inlineStyleAt(
  text: string,
  selectionStart: number,
  selectionEnd: number,
): InlineTextStyle {
  const range = resolveRange(text, selectionStart, selectionEnd);
  if (!range) return {};

  let segments = parseInlineSegments(text);
  segments = splitAt(segments, range.start);
  segments = splitAt(segments, range.end);
  const covered = segments.filter(
    (segment) =>
      segment.sourceStart >= range.start &&
      segment.sourceEnd <= range.end &&
      segment.text.trim() !== "",
  );
  if (!covered.length) return {};

  const shared: Record<string, unknown> = {};
  for (const key of INLINE_STYLE_KEYS) {
    const first = covered[0].style?.[key];
    if (first === undefined) continue;
    if (covered.every((segment) => segment.style?.[key] === first))
      shared[key] = first;
  }
  return shared as InlineTextStyle;
}
