/**
 * Stanza numbering as hymn books print it. A delimiter (`1.`, `2)`, `(3)`,
 * `IV.`) is proof enough on its own. A bare number (`1 To the work!`) is only
 * trusted when the document as a whole reads like a numbered hymn, otherwise
 * an ordinary lyric line such as "7 days a week I praise" would be mistaken
 * for a stanza opener.
 */

const DELIMITED_STANZA =
  /^\s*(?:\(\s*(\d{1,3}|[IVXLCDM]{1,7})\s*\)|(\d{1,3}|[IVXLCDM]{1,7})\s*[.)\]:-])\s+\S/;

const BARE_STANZA = /^\s*(\d{1,3})\s+\S/;

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

export function matchDelimitedStanzaNumber(line: string): number | null {
  const match = line.match(DELIMITED_STANZA);
  if (!match) return null;
  return toNumber(match[1] ?? match[2]);
}

export function matchBareStanzaNumber(line: string): number | null {
  const match = line.match(BARE_STANZA);
  return match ? toNumber(match[1]) : null;
}

export function matchStanzaNumber(
  line: string,
  allowBare: boolean,
): number | null {
  const delimited = matchDelimitedStanzaNumber(line);
  if (delimited !== null) return delimited;
  return allowBare ? matchBareStanzaNumber(line) : null;
}

/**
 * True when the stanza openers read as a numbered hymn: at least two of them
 * carry a bare number and those numbers climb.
 */
export function usesBareStanzaNumbers(openers: string[]): boolean {
  const numbers: number[] = [];
  for (const opener of openers) {
    if (matchDelimitedStanzaNumber(opener) !== null) continue;
    const value = matchBareStanzaNumber(opener);
    if (value !== null) numbers.push(value);
  }
  if (numbers.length < 2) return false;
  return numbers.every((value, i) => i === 0 || value > numbers[i - 1]);
}
