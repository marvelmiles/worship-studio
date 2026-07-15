import type { BibleVersionId, PassageRange } from "../../../types";
import { BIBLE_BOOKS, type BibleBook } from "../../../data/bibleBooks";

export interface ParsedReference {
  book: BibleBook;
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
}

const normalize = (text: string) => text.toLowerCase().replace(/[\s.]+/g, "");

/** Matches "John 3:16-18", "jn 3", "1 cor 13:4" and similar shorthand. */
export function parseReference(input: string): ParsedReference | null {
  const match = input
    .trim()
    .match(/^(\d?\s*[a-zA-Z][a-zA-Z\s.]*?)\s*(\d+)?(?::(\d+)(?:\s*[-–]\s*(\d+))?)?$/);
  if (!match) return null;

  const [, rawBook, rawChapter, rawStart, rawEnd] = match;
  const key = normalize(rawBook);
  if (!key) return null;

  const book =
    BIBLE_BOOKS.find((b) => normalize(b.name) === key || b.aliases.includes(key)) ||
    BIBLE_BOOKS.find((b) => normalize(b.name).startsWith(key));
  if (!book) return null;

  const chapter = rawChapter ? parseInt(rawChapter, 10) : 1;
  if (chapter < 1 || chapter > book.chapters) return null;

  const verseStart = rawStart ? parseInt(rawStart, 10) : undefined;
  let verseEnd = rawEnd ? parseInt(rawEnd, 10) : verseStart;
  if (verseStart !== undefined && verseEnd !== undefined && verseEnd < verseStart) {
    verseEnd = verseStart;
  }
  return { book, chapter, verseStart, verseEnd };
}

export function formatRange(range: PassageRange): string {
  const { bookName, chapter, verseStart, verseEnd } = range;
  const verses = verseStart === verseEnd ? `${verseStart}` : `${verseStart}-${verseEnd}`;
  return `${bookName} ${chapter}:${verses}`;
}

export function formatReference(range: PassageRange, version?: BibleVersionId): string {
  return version ? `${formatRange(range)} (${version})` : formatRange(range);
}
