import { parseInlineSegments } from "./inlineFormat";
import type { FormattedSegment, SourceSegment } from "./inlineFormat";
import { writeInlineSegments } from "./inlineEdit";
import type { EditResult } from "./inlineEdit";
import {
  analyzeLines,
  composeLines,
  prefixLength,
  remapColumn,
  renumber,
} from "./lists";
import { changeIndent, toggleList } from "./listCommands";
import { clamp, lineBounds, lineIndexAt } from "./textRange";
import type { TextRange } from "./textRange";

/**
 * Typing, deleting and pasting inside slide text.
 *
 * The document is plain text carrying Markdown-ish marks, so an edit is never a
 * plain string splice: cutting between `**bold**` and `*italic*` would leave the
 * markers unbalanced, and a typed `*` has to survive as a literal asterisk. Each
 * command therefore parses the affected lines into runs, edits the runs, and
 * writes them back out, which re-emits balanced markers and escapes whatever the
 * writer actually typed. Offsets in and out are raw-text offsets, the same
 * coordinates every other command in lib/ speaks.
 */

/** Formatting a run carries, without its text or its place in the source. */
type Marks = Omit<SourceSegment, "text" | "sourceStart" | "sourceEnd">;

export interface DocumentLine {
  raw: string;
  /** Indent and list marker, which belong to the line rather than to its text. */
  prefix: string;
  content: string;
  start: number;
  contentStart: number;
  end: number;
}

export function documentLines(text: string): DocumentLine[] {
  return lineBounds(text).map((bound) => {
    const raw = text.slice(bound.start, bound.end);
    const prefix = raw.slice(0, prefixLength(raw));
    return {
      raw,
      prefix,
      content: raw.slice(prefix.length),
      start: bound.start,
      contentStart: bound.start + prefix.length,
      end: bound.end,
    };
  });
}

/** Where each line's own text begins in the joined document. */
export function lineContentOffsets(lines: string[]): number[] {
  let offset = 0;
  return lines.map((line) => {
    const start = offset + prefixLength(line);
    offset += line.length + 1;
    return start;
  });
}

const lineStarts = (lines: string[]): number[] => {
  let offset = 0;
  return lines.map((line) => {
    const start = offset;
    offset += line.length + 1;
    return start;
  });
};

const marksOf = (segment: SourceSegment | undefined): Marks => {
  if (!segment) return {};
  const {
    text: _text,
    sourceStart: _start,
    sourceEnd: _end,
    ...marks
  } = segment;
  return marks;
};

/** An escape pair is one visible character written as two source characters. */
const isPlain = (segment: SourceSegment): boolean =>
  segment.sourceEnd - segment.sourceStart === segment.text.length;

/**
 * The runs covering `[from, to)` of a line's text. A cut always falls between
 * visible characters, so an escape pair is either taken whole or left out.
 */
function sliceContent(
  content: string,
  from: number,
  to: number,
): FormattedSegment[] {
  const out: FormattedSegment[] = [];
  for (const segment of parseInlineSegments(content)) {
    const start = Math.max(segment.sourceStart, from);
    const end = Math.min(segment.sourceEnd, to);
    if (start >= end) continue;
    if (!isPlain(segment)) {
      if (start > segment.sourceStart || end < segment.sourceEnd) continue;
      out.push({ ...marksOf(segment), text: segment.text });
      continue;
    }
    out.push({
      ...marksOf(segment),
      text: segment.text.slice(
        start - segment.sourceStart,
        end - segment.sourceStart,
      ),
    });
  }
  return out;
}

const segmentBefore = (
  content: string,
  offset: number,
): SourceSegment | undefined => {
  let found: SourceSegment | undefined;
  for (const segment of parseInlineSegments(content))
    if (segment.sourceStart < offset) found = segment;
  return found;
};

const segmentAfter = (
  content: string,
  offset: number,
): SourceSegment | undefined =>
  parseInlineSegments(content).find((segment) => segment.sourceEnd > offset);

interface ComposedContent {
  text: string;
  /** Where the caret lands in the written text. */
  caret: number;
}

function composeContent(
  before: FormattedSegment[],
  insert: string,
  marks: Marks,
  after: FormattedSegment[],
): ComposedContent {
  const inserted: FormattedSegment[] = insert
    ? [{ ...marks, text: insert }]
    : [];
  const segments = [...before, ...inserted, ...after];
  if (!segments.length) return { text: "", caret: 0 };

  const { text, ranges } = writeInlineSegments(segments);
  const caret = inserted.length
    ? ranges[before.length].end
    : before.length
      ? ranges[before.length - 1].end
      : ranges[0].start;
  return { text, caret };
}

/**
 * Replaces `[selectionStart, selectionEnd)` with `insert`, which may carry line
 * breaks. Typed text picks up the formatting of the run it lands in, the way a
 * word processor carries the current mark forward, and a break inside a list
 * opens the next item at the same level.
 */
export function replaceRange(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  insert: string,
): EditResult {
  const lines = documentLines(text);
  const from = Math.min(selectionStart, selectionEnd);
  const to = Math.max(selectionStart, selectionEnd);
  const firstIndex = lineIndexAt(lines, from);
  const lastIndex = lineIndexAt(lines, to);
  const first = lines[firstIndex];
  const last = lines[lastIndex];

  const cutStart = clamp(from - first.contentStart, 0, first.content.length);
  const cutEnd = clamp(to - last.contentStart, 0, last.content.length);

  const head = sliceContent(first.content, 0, cutStart);
  const tail = sliceContent(last.content, cutEnd, last.content.length);
  const marks = marksOf(
    segmentBefore(first.content, cutStart) ??
      segmentAfter(last.content, cutEnd),
  );

  const pieces = insert.split("\n");
  const composed =
    pieces.length === 1
      ? [composeContent(head, pieces[0], marks, tail)]
      : [
          composeContent(head, pieces[0], marks, []),
          ...pieces
            .slice(1, -1)
            .map((piece) => composeContent([], piece, marks, [])),
          composeContent([], pieces[pieces.length - 1], marks, tail),
        ];

  const rewritten = [
    ...lines.slice(0, firstIndex).map((line) => line.raw),
    ...composed.map((part) => first.prefix + part.text),
    ...lines.slice(lastIndex + 1).map((line) => line.raw),
  ];

  // Only a rewrite that moved lines around can leave the numbering wrong, and
  // renumbering on every keystroke would fight the writer's own ordinals.
  const structural = composed.length > 1 || lastIndex > firstIndex;
  const next = structural
    ? composeLines(renumber(analyzeLines(rewritten)))
    : rewritten;

  const caretLine = firstIndex + composed.length - 1;
  const column = remapColumn(
    rewritten[caretLine],
    next[caretLine],
    first.prefix.length + composed[composed.length - 1].caret,
  );
  const caret = lineStarts(next)[caretLine] + column;

  return {
    text: next.join("\n"),
    selectionStart: caret,
    selectionEnd: caret,
  };
}

/** The visible character ending at `offset`, escape pairs counted as one. */
function previousVisibleRange(
  content: string,
  offset: number,
): TextRange | null {
  let previous: SourceSegment | undefined;
  for (const segment of parseInlineSegments(content))
    if (segment.sourceStart < offset) previous = segment;
  if (!previous) return null;

  const end = Math.min(offset, previous.sourceEnd);
  const start = isPlain(previous) ? end - 1 : previous.sourceStart;
  return start < end ? { start, end } : null;
}

/** The visible character starting at `offset`. */
function nextVisibleRange(content: string, offset: number): TextRange | null {
  const next = parseInlineSegments(content).find(
    (segment) => segment.sourceEnd > offset,
  );
  if (!next) return null;

  const start = Math.max(offset, next.sourceStart);
  const end = isPlain(next) ? start + 1 : next.sourceEnd;
  return start < end ? { start, end } : null;
}

/**
 * Backspace. At the head of a line it undoes the line's own structure first,
 * the way Word drops the bullet before it starts pulling lines together: the
 * list marker goes, then the indent, then the line joins the one above.
 */
export function deleteBackward(
  text: string,
  selectionStart: number,
  selectionEnd: number,
): EditResult | null {
  if (selectionStart !== selectionEnd)
    return replaceRange(text, selectionStart, selectionEnd, "");

  const lines = documentLines(text);
  const index = lineIndexAt(lines, selectionStart);
  const line = lines[index];

  if (selectionStart <= line.contentStart) {
    if (line.prefix) {
      const item = analyzeLines(lines.map((entry) => entry.raw))[index];
      return item.kind
        ? toggleList(text, selectionStart, selectionStart, item.kind)
        : changeIndent(text, selectionStart, selectionStart, -1);
    }
    if (index === 0) return null;
    return replaceRange(text, lines[index - 1].end, line.contentStart, "");
  }

  const range = previousVisibleRange(
    line.content,
    selectionStart - line.contentStart,
  );
  if (!range) return null;
  return replaceRange(
    text,
    line.contentStart + range.start,
    line.contentStart + range.end,
    "",
  );
}

/** Delete. At the end of a line it pulls the next line up, marker and all. */
export function deleteForward(
  text: string,
  selectionStart: number,
  selectionEnd: number,
): EditResult | null {
  if (selectionStart !== selectionEnd)
    return replaceRange(text, selectionStart, selectionEnd, "");

  const lines = documentLines(text);
  const index = lineIndexAt(lines, selectionStart);
  const line = lines[index];

  const range = nextVisibleRange(
    line.content,
    selectionStart - line.contentStart,
  );
  if (range)
    return replaceRange(
      text,
      line.contentStart + range.start,
      line.contentStart + range.end,
      "",
    );

  if (index >= lines.length - 1) return null;
  return replaceRange(text, line.end, lines[index + 1].contentStart, "");
}
