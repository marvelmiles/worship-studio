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

const romanToNumber = (token: string): number | null => {
  let total = 0;
  let highest = 0;
  for (let i = token.length - 1; i >= 0; i--) {
    const value = ROMAN_VALUES[token[i]];
    if (!value) return null;
    total += value < highest ? -value : value;
    highest = Math.max(highest, value);
  }
  return total > 0 ? total : null;
};

const toNumber = (token: string): number | null => {
  if (/^\d+$/.test(token)) {
    const value = parseInt(token, 10);
    return value > 0 ? value : null;
  }
  return romanToNumber(token);
};

export interface StanzaOpener {
  number: number;
  text: string;
}

const readStanza = (line: string, pattern: RegExp): StanzaOpener | null => {
  const match = pattern.exec(line);
  if (!match) return null;
  const number = toNumber(match[1] ?? match[2]);
  return number === null ? null : { number, text: line.slice(match[0].length) };
};

export const matchDelimitedStanzaNumber = (line: string): number | null => {
  return readStanza(line, DELIMITED_STANZA)?.number ?? null;
};

export const matchBareStanzaNumber = (line: string): number | null => {
  return readStanza(line, BARE_STANZA)?.number ?? null;
};

export const readStanzaOpener = (
  line: string,
  allowBare: boolean,
): StanzaOpener | null => {
  const delimited = readStanza(line, DELIMITED_STANZA);
  if (delimited) return delimited;
  return allowBare ? readStanza(line, BARE_STANZA) : null;
};

export const usesBareStanzaNumbers = (openers: string[]): boolean => {
  const numbers: number[] = [];
  for (const opener of openers) {
    if (matchDelimitedStanzaNumber(opener) !== null) continue;
    const value = matchBareStanzaNumber(opener);
    if (value !== null) numbers.push(value);
  }
  if (numbers.length < 2) return false;
  return numbers.every((value, i) => i === 0 || value === numbers[i - 1] + 1);
};
