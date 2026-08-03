/** Caret and line arithmetic shared by every text-editing command. */

export interface TextRange {
  start: number;
  end: number;
}

export interface LineSelection {
  first: number;
  last: number;
}

const WORD_CHARACTER = /[\p{L}\p{N}'’-]/u;

/** The word the caret sits in or beside, the way a word processor selects it. */
export function wordAround(text: string, index: number): TextRange | null {
  let start = index;
  let end = index;
  while (start > 0 && WORD_CHARACTER.test(text[start - 1])) start -= 1;
  while (end < text.length && WORD_CHARACTER.test(text[end])) end += 1;
  return end > start ? { start, end } : null;
}

/**
 * The range a command should act on: a selection with its whitespace edges
 * given back, or the word under a collapsed caret.
 */
export function resolveRange(
  text: string,
  selectionStart: number,
  selectionEnd: number,
): TextRange | null {
  if (selectionStart === selectionEnd) return wordAround(text, selectionStart);

  let start = selectionStart;
  let end = selectionEnd;
  while (start < end && /\s/.test(text[start])) start += 1;
  while (end > start && /\s/.test(text[end - 1])) end -= 1;
  return end > start ? { start, end } : null;
}

/** Start and end offset of every line, newline characters excluded. */
export function lineBounds(text: string): TextRange[] {
  const bounds: TextRange[] = [];
  let start = 0;
  for (let index = 0; index <= text.length; index += 1) {
    if (index === text.length || text[index] === "\n") {
      bounds.push({ start, end: index });
      start = index + 1;
    }
  }
  return bounds;
}

export function lineIndexAt(bounds: TextRange[], offset: number): number {
  for (let index = 0; index < bounds.length; index += 1) {
    if (offset <= bounds[index].end) return index;
  }
  return Math.max(0, bounds.length - 1);
}

/** The lines a selection touches, the unit paragraph commands act on. */
export function selectedLines(
  text: string,
  selectionStart: number,
  selectionEnd: number,
): LineSelection {
  const bounds = lineBounds(text);
  return {
    first: lineIndexAt(bounds, selectionStart),
    last: lineIndexAt(bounds, Math.max(selectionStart, selectionEnd)),
  };
}

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));
