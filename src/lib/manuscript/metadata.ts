import { matchSectionHeader } from "./sections";
import { matchDelimitedStanzaNumber } from "./numbering";
import { DEFAULT_COLLECTION, SERMON_COLLECTION } from "../../data/collections";
import type { Collection } from "../../data/collections";

export interface ManuscriptMetadata {
  title: string | null;
  author: string | null;
  collection: Collection | null;
  consumed: number;
}

const EMPTY: ManuscriptMetadata = {
  title: null,
  author: null,
  collection: null,
  consumed: 0,
};

const LYRICS_SUFFIX = /\s*\blyrics?\b\s*$/i;
const TRAILING_PARENTHETICAL = /\s*[([][^()[\]]*[)\]]\s*$/;
const NAME_SEPARATOR = /\s+[—–|]\s+|\s+-\s+/;
const CREDIT_LINE =
  /^\s*(?:artiste?|author|composer|preacher|minister|speaker|written\s+by|performed\s+by|sung\s+by|preached\s+by|delivered\s+by)\s*[:\-–—]?\s*(.+)$/i;
const BY_LINE = /^\s*by\s+(.{2,60})$/i;

const DECLARED_KINDS: Record<string, Collection> = {
  hymn: "Hymns",
  song: "Worship",
  worship: "Worship",
  praise: "Praise",
  anthem: "Choir Ministration",
  ministration: "Choir Ministration",
  sermon: SERMON_COLLECTION,
  message: SERMON_COLLECTION,
  homily: SERMON_COLLECTION,
  preaching: SERMON_COLLECTION,
  teaching: SERMON_COLLECTION,
  devotional: SERMON_COLLECTION,
  title: DEFAULT_COLLECTION,
  topic: DEFAULT_COLLECTION,
  subject: DEFAULT_COLLECTION,
  presentation: DEFAULT_COLLECTION,
  announcement: DEFAULT_COLLECTION,
};

const DECLARED_HEADING = new RegExp(
  `^\\s*(${Object.keys(DECLARED_KINDS).join("|")})\\s*[:\\-–—]\\s*(.+)$`,
  "i",
);

const normalizeCase = (value: string): string => {
  if (/[a-z]/.test(value) || value.length < 4) return value;
  return value
    .toLowerCase()
    .replace(
      /(^|[\s(/-])([a-z])/g,
      (_m, lead: string, letter: string) => lead + letter.toUpperCase(),
    );
};

const clean = (value: string): string =>
  normalizeCase(value.trim().replace(/^[\s"'`]+|[\s"'`]+$/g, ""));

const looksLikeSection = (line: string): boolean => {
  return matchSectionHeader(line) !== null;
};

const findCredit = (
  lines: string[],
  from: number,
): { author: string; consumed: number } | null => {
  for (let i = from; i < lines.length; i++) {
    const candidate = lines[i].trim();
    if (!candidate) continue;
    if (looksLikeSection(candidate)) return null;
    const credit = candidate.match(CREDIT_LINE) || candidate.match(BY_LINE);
    if (!credit || credit[1].trim().split(/\s+/).length > 6) return null;
    const author = clean(credit[1]);
    return author ? { author, consumed: i + 1 } : null;
  }
  return null;
};

export const extractManuscriptMetadata = (
  lines: string[],
): ManuscriptMetadata => {
  const first = lines.findIndex((line) => line.trim() !== "");
  if (first === -1) return EMPTY;

  const line = lines[first].trim();

  const declared = line.match(DECLARED_HEADING);
  const declaredTitle = declared ? clean(declared[2]) : "";
  if (declared && declaredTitle) {
    const metadata: ManuscriptMetadata = {
      title: declaredTitle,
      author: null,
      collection: DECLARED_KINDS[declared[1].toLowerCase()],
      consumed: first + 1,
    };
    const credit = findCredit(lines, first + 1);
    if (credit) {
      metadata.author = credit.author;
      metadata.consumed = credit.consumed;
    }
    return metadata;
  }

  if (looksLikeSection(line)) return EMPTY;
  if (matchDelimitedStanzaNumber(line) !== null) return EMPTY;

  let heading = line.replace(TRAILING_PARENTHETICAL, "").trim();
  const fromLyricsSite = LYRICS_SUFFIX.test(heading);
  if (fromLyricsSite) heading = heading.replace(LYRICS_SUFFIX, "").trim();

  const parts = heading.split(NAME_SEPARATOR).filter((part) => part.trim());
  const separated = parts.length === 2;

  const next = lines.slice(first + 1).find((value) => value.trim() !== "");
  const standsAboveSection = Boolean(
    next && looksLikeSection(next) && lines[first + 1]?.trim() === "",
  );

  if (!heading || (!fromLyricsSite && !separated && !standsAboveSection))
    return EMPTY;

  const [title, author] = separated
    ? fromLyricsSite
      ? [parts[1], parts[0]]
      : [parts[0], parts[1]]
    : [heading, null];

  const metadata: ManuscriptMetadata = {
    title: clean(title) || null,
    author: author ? clean(author) || null : null,
    collection: null,
    consumed: first + 1,
  };

  if (metadata.author) return metadata;

  const credit = findCredit(lines, first + 1);
  if (credit) {
    metadata.author = credit.author;
    metadata.consumed = credit.consumed;
  }

  return metadata;
};
