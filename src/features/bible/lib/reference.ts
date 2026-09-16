import type { BibleVersionId, PassageRange } from "../../../types";
import { BIBLE_BOOKS, type BibleBook } from "../../../data/bibleBooks";
import { CHAPTER_VERSE_COUNTS } from "../../../data/bibleLayout";

export interface ParsedReference {
  book: BibleBook;
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
  hasChapter: boolean;
}

const normalize = (text: string) => text.toLowerCase().replace(/[\s.]+/g, "");

export const chapterVerseCount = (bookId: number, chapter: number): number =>
  CHAPTER_VERSE_COUNTS[bookId - 1]?.[chapter - 1] ?? 0;

export interface VerseSpan {
  start: number;
  end: number;
}

export const referenceSpan = (ref: ParsedReference): VerseSpan => {
  if (!ref.verseStart) {
    return { start: 1, end: chapterVerseCount(ref.book.id, ref.chapter) || 1 };
  }
  return { start: ref.verseStart, end: ref.verseEnd ?? ref.verseStart };
};

export const findBook = (name: string): BibleBook | null => {
  const key = normalize(name);
  if (!key) return null;
  return (
    BIBLE_BOOKS.find(
      (b) => normalize(b.name) === key || b.aliases.includes(key),
    ) ||
    BIBLE_BOOKS.find(
      (b) =>
        normalize(b.name).startsWith(key) ||
        b.aliases.some((a) => a.startsWith(key)),
    ) ||
    null
  );
};

export const parseReference = (input: string): ParsedReference | null => {
  const match = input
    .trim()
    .match(
      /^(\d?\s*[a-zA-Z][a-zA-Z\s.]*?)\s*(?:(\d+)(?:\s*[:.]\s*(\d+)(?:\s*[-–—]\s*(\d+))?)?)?$/,
    );
  if (!match) return null;

  const [, rawBook, rawChapter, rawStart, rawEnd] = match;
  const book = findBook(rawBook);
  if (!book) return null;

  const chapter = rawChapter ? parseInt(rawChapter, 10) : 1;
  if (chapter < 1 || chapter > book.chapters) return null;

  const verseCount = CHAPTER_VERSE_COUNTS[book.id - 1][chapter - 1];
  const verseStart = rawStart ? parseInt(rawStart, 10) : undefined;
  if (verseStart !== undefined && (verseStart < 1 || verseStart > verseCount))
    return null;

  let verseEnd = rawEnd ? parseInt(rawEnd, 10) : verseStart;
  if (verseStart !== undefined && verseEnd !== undefined) {
    verseEnd = Math.min(Math.max(verseEnd, verseStart), verseCount);
  }
  return {
    book,
    chapter,
    verseStart,
    verseEnd,
    hasChapter: Boolean(rawChapter),
  };
};

export const formatParsedReference = ({
  book,
  chapter,
  verseStart,
  verseEnd,
}: ParsedReference): string => {
  if (!verseStart) return `${book.name} ${chapter}`;
  const verses =
    !verseEnd || verseEnd === verseStart
      ? `${verseStart}`
      : `${verseStart}-${verseEnd}`;
  return `${book.name} ${chapter}:${verses}`;
};

export const formatRange = (range: PassageRange): string => {
  const { bookName, chapter, verseStart, verseEnd } = range;
  const verses =
    verseStart === verseEnd ? `${verseStart}` : `${verseStart}-${verseEnd}`;
  return `${bookName} ${chapter}:${verses}`;
};

export const formatReference = (
  range: PassageRange,
  version?: BibleVersionId,
): string => {
  return version ? `${formatRange(range)} (${version})` : formatRange(range);
};
