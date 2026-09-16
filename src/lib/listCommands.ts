import type { EditResult } from "./inlineEdit";
import {
  analyzeLines,
  composeLines,
  INDENT_UNIT,
  MAX_LIST_LEVEL,
  prefixLength,
  remapColumn,
  renumber,
} from "./lists";
import type { ListKind, ListLine } from "./lists";
import { clamp, selectedLines } from "./textRange";

interface Caret {
  line: number;
  column: number;
}

const lineStarts = (lines: string[]): number[] => {
  const starts: number[] = [];
  let offset = 0;
  for (const line of lines) {
    starts.push(offset);
    offset += line.length + 1;
  }
  return starts;
};

const toCaret = (lines: string[], offset: number): Caret => {
  const starts = lineStarts(lines);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (offset >= starts[index])
      return { line: index, column: offset - starts[index] };
  }
  return { line: 0, column: 0 };
};

const toOffset = (lines: string[], caret: Caret): number =>
  lineStarts(lines)[caret.line] +
  clamp(caret.column, 0, lines[caret.line].length);

const remapCaret = (
  before: string[],
  after: string[],
  offset: number,
): number => {
  const caret = toCaret(before, offset);
  const line = Math.min(caret.line, after.length - 1);
  return toOffset(after, {
    line,
    column: remapColumn(before[caret.line], after[line], caret.column),
  });
};

const rewrite = (
  text: string,
  before: string[],
  items: ListLine[],
  selectionStart: number,
  selectionEnd: number,
): EditResult => {
  const after = composeLines(renumber(items));
  const next = after.join("\n");
  if (next === text) return { text, selectionStart, selectionEnd };
  return {
    text: next,
    selectionStart: remapCaret(before, after, selectionStart),
    selectionEnd: remapCaret(before, after, selectionEnd),
  };
};

const capLevels = (items: ListLine[]): ListLine[] => {
  let previous = -1;
  return items.map((item) => {
    const level = item.kind ? Math.min(item.level, previous + 1) : item.level;
    previous = level;
    return level === item.level ? item : { ...item, level };
  });
};

const nestingLevel = (
  items: ListLine[],
  first: number,
  kind: ListKind,
): number | null => {
  const previous = items[first - 1];
  if (!previous?.kind) return null;
  return previous.kind === kind
    ? previous.level
    : Math.min(previous.level + 1, MAX_LIST_LEVEL);
};

export const toggleList = (
  text: string,
  selectionStart: number,
  selectionEnd: number,
  kind: ListKind,
): EditResult => {
  const lines = text.split("\n");
  const items = analyzeLines(lines);
  const { first, last } = selectedLines(text, selectionStart, selectionEnd);

  const targets: number[] = [];
  for (let index = first; index <= last; index += 1) {
    if (lines[index].trim() || first === last) targets.push(index);
  }
  if (!targets.length) return { text, selectionStart, selectionEnd };

  const removing = targets.every((index) => items[index].kind === kind);
  const hint = removing ? null : nestingLevel(items, first, kind);

  let position = 0;
  const next = items.map((item, index) => {
    if (!targets.includes(index)) return item;
    if (removing) return { ...item, kind: null, index: 0 };
    position += 1;
    return {
      ...item,
      kind,
      index: position,
      level:
        !item.kind && item.level === 0 && hint !== null ? hint : item.level,
    };
  });

  return rewrite(text, lines, capLevels(next), selectionStart, selectionEnd);
};

export const changeIndent = (
  text: string,
  selectionStart: number,
  selectionEnd: number,
  delta: number,
): EditResult => {
  const lines = text.split("\n");
  const items = analyzeLines(lines);
  const { first, last } = selectedLines(text, selectionStart, selectionEnd);

  const next = items.map((item, index) =>
    index < first || index > last
      ? item
      : { ...item, level: clamp(item.level + delta, 0, MAX_LIST_LEVEL) },
  );

  return rewrite(text, lines, capLevels(next), selectionStart, selectionEnd);
};

export const newLineInList = (
  text: string,
  selectionStart: number,
  selectionEnd: number,
): EditResult | null => {
  const lines = text.split("\n");
  const items = analyzeLines(lines);
  const start = toCaret(lines, selectionStart);
  const end = toCaret(lines, selectionEnd);
  const item = items[start.line];
  if (!item.kind && item.level === 0) return null;

  if (item.kind && selectionStart === selectionEnd && !item.content.trim()) {
    const next = [...items];
    next[start.line] =
      item.level > 0
        ? { ...item, level: item.level - 1 }
        : { ...item, kind: null, index: 0 };
    const after = composeLines(renumber(next));
    const offset =
      lineStarts(after)[start.line] + prefixLength(after[start.line]);
    return {
      text: after.join("\n"),
      selectionStart: offset,
      selectionEnd: offset,
    };
  }

  const headColumn = Math.max(prefixLength(lines[start.line]), start.column);
  const tailColumn = Math.max(prefixLength(lines[end.line]), end.column);
  const head: ListLine = {
    ...item,
    content: lines[start.line].slice(
      prefixLength(lines[start.line]),
      headColumn,
    ),
  };
  const tail: ListLine = {
    level: item.level,
    kind: item.kind,
    index: 0,
    content: lines[end.line].slice(tailColumn),
  };

  const next = [
    ...items.slice(0, start.line),
    head,
    tail,
    ...items.slice(end.line + 1),
  ];
  const after = composeLines(renumber(next));
  const offset =
    lineStarts(after)[start.line + 1] + prefixLength(after[start.line + 1]);
  return {
    text: after.join("\n"),
    selectionStart: offset,
    selectionEnd: offset,
  };
};

export const tabInList = (
  text: string,
  selectionStart: number,
  selectionEnd: number,
  outdent: boolean,
): EditResult => {
  const lines = text.split("\n");
  const { first, last } = selectedLines(text, selectionStart, selectionEnd);
  const caret = toCaret(lines, selectionStart);
  const onMarker =
    selectionStart === selectionEnd &&
    caret.column <= prefixLength(lines[caret.line]);

  if (
    outdent ||
    last > first ||
    onMarker ||
    analyzeLines(lines)[caret.line].kind
  )
    return changeIndent(text, selectionStart, selectionEnd, outdent ? -1 : 1);

  const offset = selectionStart + INDENT_UNIT.length;
  return {
    text:
      text.slice(0, selectionStart) + INDENT_UNIT + text.slice(selectionEnd),
    selectionStart: offset,
    selectionEnd: offset,
  };
};

export interface ListState {
  kind: ListKind | null;
  level: number;
}

export const listStateAt = (
  text: string,
  selectionStart: number,
  selectionEnd: number,
): ListState => {
  const lines = text.split("\n");
  const { first } = selectedLines(text, selectionStart, selectionEnd);
  const item = analyzeLines(lines)[first];
  return { kind: item?.kind ?? null, level: item?.level ?? 0 };
};
