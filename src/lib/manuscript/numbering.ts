/**
 * Stanza numbering as hymn books print it. A delimiter (`1.`, `2)`, `(3)`,
 * `IV.`) is proof enough on its own. A bare number (`1 To the work!`) is only
 * trusted when the document as a whole reads like a numbered hymn, otherwise
 * an ordinary lyric line such as "7 days a week I praise" would be mistaken
 * for a stanza opener.
 *
 * The number is the stanza's, not the lyric's: it names the verse and comes off
 * the line, so what the room reads is the words alone.
 */

const DELIMITED_STANZA =
  /^\s*(?:\(\s*(\d{1,3}|[IVXLCDM]{1,7})\s*\)|(\d{1,3}|[IVXLCDM]{1,7})\s*[.)\]:-])\s+(?=\S)/;

const BARE_STANZA = /^\s*(\d{1,3})\s+(?=\S)/;

const ROMAN_VALUES: Record<string, number> = {
  I: 1,
  V: 5,
  X: 10,
  L: 50,
  C: 100,
  D: 500,
  M: 1000,
};

function romanToNumber(token: string): number | null {
  let total = 0;
  let highest = 0;
  for (let i = token.length - 1; i >= 0; i--) {
    const value = ROMAN_VALUES[token[i]];
    if (!value) return null;
    total += value < highest ? -value : value;
    highest = Math.max(highest, value);
  }
  return total > 0 ? total : null;
}

function toNumber(token: string): number | null {
  if (/^\d+$/.test(token)) {
    const value = parseInt(token, 10);
    return value > 0 ? value : null;
  }
  return romanToNumber(token);
}

export interface StanzaOpener {
  /** The stanza's number, which becomes its label: `2.` -> "Verse 2". */
  number: number;
  /** The line with the number taken off, which is the lyric itself. */
  text: string;
}

function readStanza(line: string, pattern: RegExp): StanzaOpener | null {
  const match = pattern.exec(line);
  if (!match) return null;
  const number = toNumber(match[1] ?? match[2]);
  return number === null ? null : { number, text: line.slice(match[0].length) };
}

export function matchDelimitedStanzaNumber(line: string): number | null {
  return readStanza(line, DELIMITED_STANZA)?.number ?? null;
}

export function matchBareStanzaNumber(line: string): number | null {
  return readStanza(line, BARE_STANZA)?.number ?? null;
}

/** The stanza a line opens, if it opens one, and the lyric left behind. */
export function readStanzaOpener(
  line: string,
  allowBare: boolean,
): StanzaOpener | null {
  const delimited = readStanza(line, DELIMITED_STANZA);
  if (delimited) return delimited;
  return allowBare ? readStanza(line, BARE_STANZA) : null;
}

/**
 * True when the stanza openers read as a numbered hymn: at least two of them
 * carry a bare number and those numbers run on one at a time, the way a hymn
 * book counts its verses.
 *
 * The count has to be unbroken because the number is taken off the line. A run
 * with a gap in it, "7 days a week I praise" and "9 to 5 I lift Him up", is two
 * lyrics that happen to start with a figure, and reading them as stanza numbers
 * would rub a word off each one.
 */
export function usesBareStanzaNumbers(openers: string[]): boolean {
  const numbers: number[] = [];
  for (const opener of openers) {
    if (matchDelimitedStanzaNumber(opener) !== null) continue;
    const value = matchBareStanzaNumber(opener);
    if (value !== null) numbers.push(value);
  }
  if (numbers.length < 2) return false;
  return numbers.every((value, i) => i === 0 || value === numbers[i - 1] + 1);
}
