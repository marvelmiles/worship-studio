import {
  MARKER_TOKENS,
  parseInlineSegments,
  WORD_BOUNDARY_TOKENS,
} from "./inlineFormat";
import type {
  FormattedSegment,
  InlineMarkName,
  SourceSegment,
} from "./inlineFormat";
import {
  INLINE_STYLE_KEYS,
  openingToken,
  SPAN_CLOSE,
  SPAN_OPEN,
} from "./inlineStyle";
import type { InlineStyleKey, InlineTextStyle } from "./inlineStyle";
import { prefixLength } from "./lists";
import { lineBounds, resolveRange } from "./textRange";
import type { TextRange } from "./textRange";

export interface EditResult {
  text: string;
  selectionStart: number;
  selectionEnd: number;
}

interface MarkToken {
  key: keyof FormattedSegment;
  token: string;
}

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

const needsEscape = (text: string, index: number): boolean => {
  const char = text[index];
  if (char === "\\") return true;
  if (text.startsWith(SPAN_OPEN, index)) return true;
  for (const token of MARKER_TOKENS) {
    if (!text.startsWith(token, index)) continue;
    if (!WORD_BOUNDARY_TOKENS.includes(token)) return true;
    return !WORD_CHARACTER.test(text[index - 1] ?? "");
  }
  return false;
};

const escapeText = (text: string): string => {
  let out = "";
  for (let index = 0; index < text.length; index += 1) {
    if (needsEscape(text, index)) out += "\\";
    out += text[index];
  }
  return out;
};

interface WrittenText {
  text: string;
  ranges: TextRange[];
}

export const writeInlineSegments = (
  segments: FormattedSegment[],
): WrittenText => {
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
      const openToken = opening.map(({ token }) => token).join("");
      const closeToken = opening
        .map(({ token }) => token)
        .reverse()
        .join("");

      const written = segments
        .slice(cursor, runEnd)
        .map((segment) => escapeText(segment.text));
      const joined = written.join("");
      const leadLength = openToken
        ? joined.length - joined.trimStart().length
        : 0;
      const bodyEnd = openToken ? joined.trimEnd().length : joined.length;
      const marked = leadLength < bodyEnd;

      const base = text.length;
      text += joined.slice(0, marked ? leadLength : joined.length);
      if (marked) text += openToken;
      const bodyStart = text.length;
      if (marked) {
        text += joined.slice(leadLength, bodyEnd);
        text += closeToken;
        text += joined.slice(bodyEnd);
      }

      const place = (offset: number, atEnd: boolean): number => {
        if (!marked) return base + offset;
        if (offset < leadLength || (offset === leadLength && atEnd))
          return base + offset;
        if (offset < bodyEnd || (offset === bodyEnd && atEnd))
          return bodyStart + (offset - leadLength);
        return (
          bodyStart +
          (bodyEnd - leadLength) +
          closeToken.length +
          (offset - bodyEnd)
        );
      };

      let offset = 0;
      for (let i = cursor; i < runEnd; i += 1) {
        const length = written[i - cursor].length;
        ranges[i] = {
          start: place(offset, false),
          end: place(offset + length, true),
        };
        offset += length;
      }
      cursor = runEnd;
    }

    if (span) text += SPAN_CLOSE;
    index = spanEnd;
  }

  return { text, ranges };
};

const splitAt = (
  segments: SourceSegment[],
  offset: number,
): SourceSegment[] => {
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
};

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

export type SegmentPatch = (segment: FormattedSegment) => FormattedSegment;

interface LineEdit {
  text: string;
  start: number;
  end: number;
}

const editLine = (
  line: string,
  from: number,
  to: number,
  patch: SegmentPatch,
): LineEdit => {
  let segments = parseInlineSegments(line);
  segments = splitAt(segments, from);
  segments = splitAt(segments, to);

  const covered: number[] = [];
  const edited = segments.map((segment, index) => {
    if (segment.sourceStart < from || segment.sourceEnd > to) return segment;
    covered.push(index);
    return patch(segment);
  });
  if (!covered.length) return { text: line, start: from, end: to };

  const { text, ranges } = writeInlineSegments(edited);
  return {
    text,
    start: ranges[covered[0]].start,
    end: ranges[covered[covered.length - 1]].end,
  };
};

export const applyToSelection = (
  text: string,
  selectionStart: number,
  selectionEnd: number,
  patch: SegmentPatch,
): EditResult => {
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
    const from = Math.max(
      prefixLength(line),
      Math.min(line.length, range.start - bound.start),
    );
    const to = Math.max(0, Math.min(line.length, range.end - bound.start));
    if (from >= to || !line.trim()) {
      offset += line.length + 1;
      return line;
    }
    const edit = editLine(line, from, to, patch);
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
};

export const coveredSegments = (
  text: string,
  selectionStart: number,
  selectionEnd: number,
): SourceSegment[] => {
  const range = resolveRange(text, selectionStart, selectionEnd);
  if (!range) return [];

  let segments = parseInlineSegments(text);
  segments = splitAt(segments, range.start);
  segments = splitAt(segments, range.end);
  return segments.filter(
    (segment) =>
      segment.sourceStart >= range.start &&
      segment.sourceEnd <= range.end &&
      segment.text.trim() !== "",
  );
};

export const applyInlineStyle = (
  text: string,
  selectionStart: number,
  selectionEnd: number,
  key: InlineStyleKey,
  value: unknown,
): EditResult => {
  return applyToSelection(text, selectionStart, selectionEnd, (segment) => ({
    ...segment,
    style: patchStyle(segment.style, key, value),
  }));
};

export const applyInlineMark = (
  text: string,
  selectionStart: number,
  selectionEnd: number,
  mark: InlineMarkName,
  on: boolean,
): EditResult => {
  return applyToSelection(text, selectionStart, selectionEnd, (segment) => {
    const next: FormattedSegment = { ...segment };
    if (on) next[mark] = true;
    else delete next[mark];
    return next;
  });
};

export const clearInlineFormatting = (
  text: string,
  selectionStart: number,
  selectionEnd: number,
): EditResult => {
  return applyToSelection(text, selectionStart, selectionEnd, (segment) => ({
    text: segment.text,
  }));
};

export const isInlineMarkActive = (
  text: string,
  selectionStart: number,
  selectionEnd: number,
  mark: InlineMarkName,
): boolean => {
  const covered = coveredSegments(text, selectionStart, selectionEnd);
  return (
    covered.length > 0 && covered.every((segment) => Boolean(segment[mark]))
  );
};

export const inlineStyleAt = (
  text: string,
  selectionStart: number,
  selectionEnd: number,
): InlineTextStyle => {
  const covered = coveredSegments(text, selectionStart, selectionEnd);
  if (!covered.length) return {};

  const shared: Record<string, unknown> = {};
  for (const key of INLINE_STYLE_KEYS) {
    const first = covered[0].style?.[key];
    if (first === undefined) continue;
    if (covered.every((segment) => segment.style?.[key] === first))
      shared[key] = first;
  }
  return shared as InlineTextStyle;
};
