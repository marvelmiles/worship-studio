import {
  decodeInlineStyle,
  hasInlineStyle,
  mergeInlineStyle,
  SPAN_CLOSE,
  SPAN_OPEN,
  SPAN_OPEN_END,
} from "./inlineStyle";
import type { InlineTextStyle } from "./inlineStyle";

export interface InlineStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  highlight?: boolean;
}

export interface FormattedSegment extends InlineStyle {
  text: string;
  /** Character-level style from a `[[…]]` span, see lib/inlineStyle.ts. */
  style?: InlineTextStyle;
}

/**
 * A segment that still knows where it came from. `sourceEnd - sourceStart`
 * equals `text.length` except for an escaped character, which is always its own
 * one-character segment produced by two source characters. That invariant is
 * what lets an editor map a caret in the raw text onto a segment and back.
 */
export interface SourceSegment extends FormattedSegment {
  sourceStart: number;
  sourceEnd: number;
}

interface Marker {
  token: string;
  style: InlineStyle;
  /**
   * Underscore markers only open and close at word boundaries, so words like
   * hallelujah_and_amen or file_name survive untouched.
   */
  wordBoundary: boolean;
}

/** Longest tokens first so `***` is never read as `**` followed by `*`. */
const MARKERS: Marker[] = [
  { token: "***", style: { bold: true, italic: true }, wordBoundary: false },
  { token: "___", style: { bold: true, italic: true }, wordBoundary: true },
  { token: "**", style: { bold: true }, wordBoundary: false },
  { token: "__", style: { bold: true }, wordBoundary: true },
  { token: "++", style: { underline: true }, wordBoundary: false },
  { token: "==", style: { highlight: true }, wordBoundary: false },
  { token: "~~", style: { strikethrough: true }, wordBoundary: false },
  { token: "*", style: { italic: true }, wordBoundary: false },
  { token: "_", style: { italic: true }, wordBoundary: true },
];

/** Every emphasis token, longest first, for escaping on the way back out. */
export const MARKER_TOKENS: string[] = MARKERS.map((marker) => marker.token);

/** Tokens that only mean something at a word boundary, so only escaped there. */
export const WORD_BOUNDARY_TOKENS: string[] = MARKERS.filter(
  (marker) => marker.wordBoundary,
).map((marker) => marker.token);

export const ESCAPABLE = new Set([
  "*",
  "_",
  "~",
  "+",
  "=",
  "\\",
  "[",
  "]",
  "#",
  ">",
]);

const WORD_CHARACTER = /[\p{L}\p{N}]/u;

const isWordCharacter = (char: string | undefined): boolean =>
  Boolean(char) && WORD_CHARACTER.test(char as string);

const isWhitespace = (char: string | undefined): boolean =>
  !char || /\s/.test(char);

const styleKeys = (style: InlineStyle) =>
  Object.keys(style) as (keyof InlineStyle)[];

/** True when every effect this marker would add is already in force. */
function alreadyStyled(active: InlineStyle, style: InlineStyle): boolean {
  return styleKeys(style).every((key) => active[key]);
}

function canOpen(text: string, index: number, marker: Marker): boolean {
  const after = text[index + marker.token.length];
  if (isWhitespace(after)) return false;
  return !marker.wordBoundary || !isWordCharacter(text[index - 1]);
}

function canClose(text: string, index: number, marker: Marker): boolean {
  if (isWhitespace(text[index - 1])) return false;
  const after = text[index + marker.token.length];
  return !marker.wordBoundary || !isWordCharacter(after);
}

/** Index of the marker's matching closing token, or -1 when it never closes. */
function findClosing(
  text: string,
  from: number,
  to: number,
  marker: Marker,
): number {
  let index = from;
  while (index < to) {
    if (text[index] === "\\" && ESCAPABLE.has(text[index + 1])) {
      index += 2;
      continue;
    }
    if (
      index > from &&
      text.startsWith(marker.token, index) &&
      canClose(text, index, marker)
    ) {
      return index;
    }
    index += 1;
  }
  return -1;
}

interface SpanMatch {
  style: InlineTextStyle;
  contentStart: number;
  contentEnd: number;
  /** First index after the closing token. */
  end: number;
}

/** Index of the `[[/]]` that closes the span opened at `from`, honouring nesting. */
function findSpanClose(text: string, from: number, to: number): number {
  let depth = 0;
  let index = from;
  while (index < to) {
    if (text[index] === "\\" && ESCAPABLE.has(text[index + 1])) {
      index += 2;
      continue;
    }
    if (text.startsWith(SPAN_CLOSE, index)) {
      if (depth === 0) return index;
      depth -= 1;
      index += SPAN_CLOSE.length;
      continue;
    }
    if (text.startsWith(SPAN_OPEN, index)) {
      const header = text.indexOf(SPAN_OPEN_END, index + SPAN_OPEN.length);
      if (header !== -1 && header < to) {
        depth += 1;
        index = header + SPAN_OPEN_END.length;
        continue;
      }
    }
    index += 1;
  }
  return -1;
}

/** Reads a `[[attrs]]…[[/]]` run starting at `index`, or null when there isn't one. */
function matchSpan(text: string, index: number, to: number): SpanMatch | null {
  if (!text.startsWith(SPAN_OPEN, index)) return null;
  if (text.startsWith(SPAN_CLOSE, index)) return null;
  const header = text.indexOf(SPAN_OPEN_END, index + SPAN_OPEN.length);
  if (header === -1 || header >= to) return null;

  const style = decodeInlineStyle(text.slice(index + SPAN_OPEN.length, header));
  if (!hasInlineStyle(style)) return null;

  const contentStart = header + SPAN_OPEN_END.length;
  const contentEnd = findSpanClose(text, contentStart, to);
  if (contentEnd === -1) return null;
  return {
    style,
    contentStart,
    contentEnd,
    end: contentEnd + SPAN_CLOSE.length,
  };
}

function parseRange(
  text: string,
  from: number,
  to: number,
  marks: InlineStyle,
  style: InlineTextStyle | undefined,
): SourceSegment[] {
  const segments: SourceSegment[] = [];
  let buffer = "";
  let bufferStart = from;
  let index = from;

  const flush = (end: number) => {
    if (!buffer) return;
    segments.push({
      text: buffer,
      ...marks,
      style,
      sourceStart: bufferStart,
      sourceEnd: end,
    });
    buffer = "";
  };

  while (index < to) {
    const char = text[index];

    if (char === "\\" && index + 1 < to && ESCAPABLE.has(text[index + 1])) {
      flush(index);
      segments.push({
        text: text[index + 1],
        ...marks,
        style,
        sourceStart: index,
        sourceEnd: index + 2,
      });
      index += 2;
      continue;
    }

    const span = matchSpan(text, index, to);
    if (span) {
      flush(index);
      segments.push(
        ...parseRange(
          text,
          span.contentStart,
          span.contentEnd,
          marks,
          mergeInlineStyle(style, span.style),
        ),
      );
      index = span.end;
      continue;
    }

    const marker = MARKERS.find(
      (candidate) =>
        text.startsWith(candidate.token, index) &&
        !alreadyStyled(marks, candidate.style) &&
        canOpen(text, index, candidate),
    );
    const closing = marker
      ? findClosing(text, index + marker.token.length, to, marker)
      : -1;

    // An unmatched marker is just punctuation the writer typed, keep it.
    if (marker && closing !== -1) {
      flush(index);
      segments.push(
        ...parseRange(
          text,
          index + marker.token.length,
          closing,
          { ...marks, ...marker.style },
          style,
        ),
      );
      index = closing + marker.token.length;
      continue;
    }

    if (!buffer) bufferStart = index;
    buffer += char;
    index += 1;
  }

  flush(index);
  return segments;
}

const sameFormatting = (a: FormattedSegment, b: FormattedSegment): boolean =>
  a.bold === b.bold &&
  a.italic === b.italic &&
  a.underline === b.underline &&
  a.strikethrough === b.strikethrough &&
  a.highlight === b.highlight &&
  JSON.stringify(a.style ?? null) === JSON.stringify(b.style ?? null);

/**
 * Splits a line of slide text into styled runs using the Markdown emphasis
 * people already type into lyric documents: `**bold**`, `__bold__`,
 * `*italic*`, `_italic_`, `***bold italic***` and `~~strikethrough~~`, plus
 * `++underline++` and `==highlight==` for the marks Markdown has no syntax for,
 * and `[[size=8;color=#fff]]…[[/]]` for the character-level styles a word
 * processor applies to a highlighted phrase. A marker that never closes stays
 * on screen as literal text, and any marker can be escaped with a backslash.
 */
export function parseInlineFormatting(text: string): FormattedSegment[] {
  const merged: FormattedSegment[] = [];
  for (const segment of parseInlineSegments(text)) {
    const previous = merged[merged.length - 1];
    if (previous && sameFormatting(previous, segment)) {
      previous.text += segment.text;
      continue;
    }
    const { sourceStart: _start, sourceEnd: _end, ...rest } = segment;
    merged.push({ ...rest });
  }
  return merged;
}

/** The same parse, keeping each run's position in the raw text. */
export function parseInlineSegments(text: string): SourceSegment[] {
  return parseRange(text, 0, text.length, {}, undefined);
}

/** The same line with every formatting marker resolved away, for speech and search. */
export function stripInlineFormatting(text: string): string {
  return parseInlineSegments(text)
    .map((segment) => segment.text)
    .join("");
}
