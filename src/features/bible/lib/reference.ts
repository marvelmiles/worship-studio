import type { BibleVersionId, PassageRange } from "../../../types";
import { BIBLE_BOOKS, type BibleBook } from "../../../data/bibleBooks";
import { CHAPTER_VERSE_COUNTS } from "../../../data/bibleLayout";

export interface ParsedReference {
  book: BibleBook;
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
  /**
   * False when the query named only a book ("job"), in which case `chapter`
   * falls back to 1. Callers that treat a bare book name differently from a
   * real chapter reference check this.
   */
  hasChapter: boolean;
}

const normalize = (text: string) => text.toLowerCase().replace(/[\s.]+/g, "");

/** How many verses a chapter holds, straight from the versification table. */
export const chapterVerseCount = (bookId: number, chapter: number): number =>
  CHAPTER_VERSE_COUNTS[bookId - 1]?.[chapter - 1] ?? 0;

/** Inclusive verse span a reference covers; a chapter-only reference covers all of it. */
export interface VerseSpan {
  start: number;
  end: number;
}

/**
 * The verses a parsed reference actually refers to. "Jn 2:3-10" is verses
 * 3-10, "Jn 2:1" is a single verse, and "Jn 2" is the whole chapter, so
 * presenting or opening a chapter reference takes all of it rather than
 * landing on verse 1 alone.
 */
export function referenceSpan(ref: ParsedReference): VerseSpan {
  if (!ref.verseStart) {
    return { start: 1, end: chapterVerseCount(ref.book.id, ref.chapter) || 1 };
  }
  return { start: ref.verseStart, end: ref.verseEnd ?? ref.verseStart };
}

/** Resolves "job", "jb", "1 cor", "songofsongs" and prefixes to one book. */
export function findBook(name: string): BibleBook | null {
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
}

/**
 * Matches "John 3:16-18", "jn 3", "1 cor 13:4", "job 2.3" and similar
 * shorthand. Chapter and verse numbers are validated against the real
 * versification, so an out-of-range reference like "job 2:99" is rejected
 * rather than pointing the reader at a verse that doesn't exist.
 */
export function parseReference(input: string): ParsedReference | null {
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
    // A backwards or overlong range ("2:5-3", "2:3-999") collapses to what
    // the chapter actually holds instead of failing the whole reference.
    verseEnd = Math.min(Math.max(verseEnd, verseStart), verseCount);
  }
  return {
    book,
    chapter,
    verseStart,
    verseEnd,
    hasChapter: Boolean(rawChapter),
  };
}

export function formatRange(range: PassageRange): string {
  const { bookName, chapter, verseStart, verseEnd } = range;
  const verses =
    verseStart === verseEnd ? `${verseStart}` : `${verseStart}-${verseEnd}`;
  return `${bookName} ${chapter}:${verses}`;
}

export function formatReference(
  range: PassageRange,
  version?: BibleVersionId,
): string {
  return version ? `${formatRange(range)} (${version})` : formatRange(range);
}
