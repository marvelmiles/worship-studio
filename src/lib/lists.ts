/**
 * Word-processor lists for plain-text slide lines.
 *
 * A list item is written the way it reads: an indent, a marker, a space, then
 * the text. `- Grace`, `1. Grace`, `a. Grace`, `iv. Grace`. Nothing else is
 * stored, so the text stays copy-pasteable and any document that already uses
 * numbered points is understood on the way in.
 *
 * Ordinals are never trusted as typed. Every command rewrites the whole
 * document through `renumber`, which walks the indent levels and gives each run
 * its own counter, so inserting, deleting, promoting or demoting an item leaves
 * the numbering correct the way Word does.
 */

export type ListKind =
  | "bullet"
  | "decimal"
  | "lower-alpha"
  | "upper-alpha"
  | "lower-roman"
  | "upper-roman";

export const ORDERED_LIST_KINDS: ListKind[] = [
  "decimal",
  "lower-alpha",
  "upper-alpha",
  "lower-roman",
  "upper-roman",
];

export const LIST_KINDS: ListKind[] = ["bullet", ...ORDERED_LIST_KINDS];

export const LIST_KIND_LABELS: Record<ListKind, string> = {
  bullet: "Bulleted list",
  decimal: "Numbered list",
  "lower-alpha": "Lettered list (a, b, c)",
  "upper-alpha": "Lettered list (A, B, C)",
  "lower-roman": "Roman numerals (i, ii, iii)",
  "upper-roman": "Roman numerals (I, II, III)",
};

export const INDENT_UNIT = "  ";
export const MAX_LIST_LEVEL = 8;

/** Cycles with depth, the way every word processor varies nested bullets. */
const BULLET_GLYPHS = ["•", "◦", "▪"];

const BULLET_MARKER = /^([-•◦▪])[ \t]+/;
const ORDERED_MARKER =
  /^(\d{1,3}|[A-Za-z]|[ivxlcdm]{2,6}|[IVXLCDM]{2,6})[.)][ \t]+/;

/** Single letters that read as both a letter and a numeral, e.g. `i.`, `v.`. */
const AMBIGUOUS_ORDINAL = /^[ivxlcdm]$/i;
const ROMAN_ONLY = /^[ivxlcdm]+$/i;

export interface ListLine {
  /** Indent depth. Applies to plain paragraphs too, which is Tab with no list. */
  level: number;
  /** null when the line is not a list item. */
  kind: ListKind | null;
  /** 1-based position within the item's own run, 0 for a plain line. */
  index: number;
  /** The line with its indent and marker removed. */
  content: string;
}

const ROMAN_UNITS: [number, string][] = [
  [1000, "m"],
  [900, "cm"],
  [500, "d"],
  [400, "cd"],
  [100, "c"],
  [90, "xc"],
  [50, "l"],
  [40, "xl"],
  [10, "x"],
  [9, "ix"],
  [5, "v"],
  [4, "iv"],
  [1, "i"],
];

function toRoman(value: number): string {
  let remaining = Math.max(1, Math.min(3999, Math.floor(value)));
  let out = "";
  for (const [amount, numeral] of ROMAN_UNITS) {
    while (remaining >= amount) {
      out += numeral;
      remaining -= amount;
    }
  }
  return out;
}

/** 1 -> a, 26 -> z, 27 -> aa, the way spreadsheet columns are lettered. */
function toAlpha(value: number): string {
  let remaining = Math.max(1, Math.floor(value));
  let out = "";
  while (remaining > 0) {
    const digit = (remaining - 1) % 26;
    out = String.fromCharCode(97 + digit) + out;
    remaining = Math.floor((remaining - 1) / 26);
  }
  return out;
}

/** The ordinal on its own: `4`, `d`, `IV`. Bullets have none. */
export function ordinalLabel(kind: ListKind, index: number): string {
  switch (kind) {
    case "decimal":
      return String(Math.max(1, index));
    case "lower-alpha":
      return toAlpha(index);
    case "upper-alpha":
      return toAlpha(index).toUpperCase();
    case "lower-roman":
      return toRoman(index);
    case "upper-roman":
      return toRoman(index).toUpperCase();
    default:
      return "";
  }
}

/** What the slide shows for this item. */
export function listMarkerLabel(
  kind: ListKind,
  index: number,
  level: number,
): string {
  if (kind === "bullet") return BULLET_GLYPHS[level % BULLET_GLYPHS.length];
  return `${ordinalLabel(kind, index)}.`;
}

/** What gets written into the text. Bullets always store the portable `-`. */
function storedMarker(kind: ListKind, index: number): string {
  return kind === "bullet" ? "-" : `${ordinalLabel(kind, index)}.`;
}

function kindOfOrdinal(token: string): ListKind {
  if (/^\d+$/.test(token)) return "decimal";
  const upper = token === token.toUpperCase();
  const roman =
    ROMAN_ONLY.test(token) && (token.length > 1 || /^i$/i.test(token));
  if (roman) return upper ? "upper-roman" : "lower-roman";
  return upper ? "upper-alpha" : "lower-alpha";
}

interface MarkerMatch {
  kind: ListKind;
  content: string;
  /** Reads as both a letter and a numeral, so it never overrides a running kind. */
  ambiguous: boolean;
}

function matchMarker(rest: string): MarkerMatch | null {
  const bullet = BULLET_MARKER.exec(rest);
  if (bullet)
    return {
      kind: "bullet",
      content: rest.slice(bullet[0].length),
      ambiguous: false,
    };

  const ordered = ORDERED_MARKER.exec(rest);
  if (!ordered) return null;
  return {
    kind: kindOfOrdinal(ordered[1]),
    content: rest.slice(ordered[0].length),
    ambiguous: AMBIGUOUS_ORDINAL.test(ordered[1]),
  };
}

/** Leading whitespace as an indent depth. A tab counts as one level. */
export function splitIndent(line: string): { level: number; rest: string } {
  let index = 0;
  let spaces = 0;
  let level = 0;
  while (index < line.length) {
    const char = line[index];
    if (char === "\t") level += 1;
    else if (char === " ") spaces += 1;
    else break;
    index += 1;
  }
  return {
    level: Math.min(
      MAX_LIST_LEVEL,
      level + Math.floor(spaces / INDENT_UNIT.length),
    ),
    rest: line.slice(index),
  };
}

/** The indent and marker in front of a line's text, for keeping a caret in place. */
export function prefixLength(line: string): number {
  const { rest } = splitIndent(line);
  const marker = matchMarker(rest);
  return line.length - (marker ? marker.content.length : rest.length);
}

/** The line's own text, with any indent and list marker taken off. */
export function stripListMarker(line: string): string {
  const { rest } = splitIndent(line);
  return matchMarker(rest)?.content ?? rest;
}

/**
 * Gives every run its own counter. A run is a stretch of items at one indent
 * level sharing one kind; going deeper opens a nested run, coming back out
 * closes it, and a paragraph with no marker ends them all.
 */
export function renumber(items: ListLine[]): ListLine[] {
  const stack: { level: number; kind: ListKind; count: number }[] = [];
  return items.map((item) => {
    if (!item.kind) {
      if (item.content.trim() !== "") stack.length = 0;
      return { ...item, index: 0 };
    }
    while (stack.length && stack[stack.length - 1].level > item.level)
      stack.pop();
    let frame = stack[stack.length - 1];
    if (!frame || frame.level !== item.level || frame.kind !== item.kind) {
      if (frame?.level === item.level) stack.pop();
      frame = { level: item.level, kind: item.kind, count: 0 };
      stack.push(frame);
    }
    frame.count += 1;
    return { ...item, index: frame.count };
  });
}

/**
 * Reads raw lines into list items. An ordinal that could be either a letter or
 * a numeral keeps whatever kind the run it joins is already using, so the ninth
 * lettered point stays `i.` in a lettered list.
 */
export function analyzeLines(lines: string[]): ListLine[] {
  const kindByLevel = new Map<number, ListKind>();
  const parsed = lines.map((line) => {
    const { level, rest } = splitIndent(line);
    const marker = matchMarker(rest);
    if (!marker) {
      if (rest.trim() !== "") kindByLevel.clear();
      return { level, kind: null, index: 0, content: rest };
    }
    for (const depth of [...kindByLevel.keys()])
      if (depth > level) kindByLevel.delete(depth);
    const running = kindByLevel.get(level);
    const kind = running && marker.ambiguous ? running : marker.kind;
    kindByLevel.set(level, kind);
    return { level, kind, index: 0, content: marker.content };
  });
  return renumber(parsed);
}

export function composeLine(item: ListLine): string {
  const indent = INDENT_UNIT.repeat(Math.max(0, item.level));
  if (!item.kind) return indent + item.content;
  return `${indent}${storedMarker(item.kind, item.index)} ${item.content}`;
}

export const composeLines = (items: ListLine[]): string[] =>
  items.map(composeLine);
