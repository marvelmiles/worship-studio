const COUNT = String.raw`(?:x\s*(\d{1,3})|(\d{1,3})\s*(?:x|ce|ces|times?))`;

const BRACKETED_COUNT = new RegExp(String.raw`[([]\s*${COUNT}\s*[)\]]`, "gi");

const TRAILING_COUNT = new RegExp(String.raw`(^|\s|/)\s*${COUNT}\s*$`, "i");

const REPEAT_DIRECTIVE =
  /^\s*(\[|\()?\s*repeat\b\s*(?:the\s+)?([a-zA-Z][a-zA-Z0-9 '\-/]*?)?\s*(\]|\))?\s*$/i;

const TRAILING_REFERENCE =
  /\s*[([]\s*([a-zA-Z][a-zA-Z0-9 '\-/]{0,23})\s*[)\]]\s*$/;

export interface RepeatCount {
  text: string;
  count: number | null;
}

export interface RepeatDirective {
  target: string | null;
  count: number | null;
  bracketed: boolean;
}

const tidy = (text: string): string => {
  return text
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
};

const countOf = (first: string | undefined, second: string | undefined) => {
  const raw = first ?? second;
  if (!raw) return null;
  const value = parseInt(raw, 10);
  return Number.isFinite(value) && value > 1 ? value : null;
};

export const extractRepeatCount = (text: string): RepeatCount => {
  const found: number[] = [];
  const remember = (value: number | null) => {
    if (value !== null) found.push(value);
  };

  let stripped = text.replace(BRACKETED_COUNT, (_match, x, plain) => {
    remember(countOf(x, plain));
    return " ";
  });

  const trailing = stripped.match(TRAILING_COUNT);
  if (trailing) {
    remember(countOf(trailing[2], trailing[3]));
    stripped = stripped.slice(0, trailing.index ?? 0);
  }

  if (!found.length) return { text, count: null };
  return { text: tidy(stripped), count: Math.max(...found) };
};

export const matchRepeatDirective = (
  line: string,
  isKnownSection: (name: string) => boolean,
): RepeatDirective | null => {
  const { text, count } = extractRepeatCount(line);
  const match = text.match(REPEAT_DIRECTIVE);
  if (!match) return null;

  const bracketed = Boolean(match[1] && match[3]);
  const target = match[2]?.trim() || null;
  if (target && !bracketed && !isKnownSection(target)) return null;
  return { target, count, bracketed };
};

export const extractSectionReference = (
  text: string,
  isKnownSection: (name: string) => boolean,
): { text: string; reference: string | null } => {
  const match = text.match(TRAILING_REFERENCE);
  if (!match || !isKnownSection(match[1])) return { text, reference: null };
  const stripped = text.slice(0, match.index ?? 0);
  if (!stripped.trim()) return { text, reference: null };
  return { text: tidy(stripped), reference: match[1].trim() };
};
