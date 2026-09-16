import type { BibleVerse, BibleVersionId } from "../../../types";
import {
  CHAPTER_VERSE_COUNTS,
  chapterStartPosition,
} from "../../../data/bibleLayout";

const VERSE_FILES: Record<
  BibleVersionId,
  () => Promise<{ default: string[] }>
> = {
  KJV: () => import("holy-bible/bibles/kjv.json"),
  ASV: () => import("holy-bible/bibles/asv.json"),
};

const cleanVerseText = (raw: string): string =>
  raw === "[]" ? "" : raw.replace(/`([^`]*?)'/g, "$1").trim();

const loadedTranslations = new Map<BibleVersionId, Promise<string[]>>();

const loadTranslation = (version: BibleVersionId): Promise<string[]> => {
  const loadVerseFile = VERSE_FILES[version] || VERSE_FILES.KJV;
  let loading = loadedTranslations.get(version);
  if (!loading) {
    loading = loadVerseFile().then((file) => file.default.map(cleanVerseText));
    loading.catch(() => loadedTranslations.delete(version));
    loadedTranslations.set(version, loading);
  }
  return loading;
};

export class BibleLoadError extends Error {
  offline: boolean;

  constructor(message: string, offline: boolean) {
    super(message);
    this.offline = offline;
  }
}

const translationUnavailable = (version: BibleVersionId): BibleLoadError => {
  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  return new BibleLoadError(
    offline
      ? `You're offline and the ${version} text hasn't been downloaded yet. Connect once and it stays available offline.`
      : `Couldn't load the ${version} text. Reload the app and try again.`,
    offline,
  );
};

export const getChapterVerses = async (
  version: BibleVersionId,
  bookId: number,
  chapter: number,
  _signal?: AbortSignal,
): Promise<BibleVerse[]> => {
  let allVerses: string[];
  try {
    allVerses = await loadTranslation(version);
  } catch {
    throw translationUnavailable(version);
  }

  const start = chapterStartPosition(bookId, chapter);
  if (start < 0) throw new BibleLoadError("That chapter doesn't exist.", false);

  const verseCount = CHAPTER_VERSE_COUNTS[bookId - 1][chapter - 1];
  const verses: BibleVerse[] = [];
  for (let verse = 1; verse <= verseCount; verse++) {
    const text = allVerses[start + verse - 1];
    if (text) verses.push({ v: verse, t: text });
  }
  if (!verses.length)
    throw new BibleLoadError("This chapter has no verses.", false);
  return verses;
};

export interface BibleSearchResult {
  bookId: number;
  chapter: number;
  verse: number;
  text: string;
}

export const SEARCH_PAGE_SIZE = 40;

export const searchBibleVerses = async (
  version: BibleVersionId,
  query: string,
  page: number,
  _signal?: AbortSignal,
): Promise<{ results: BibleSearchResult[]; total: number }> => {
  let allVerses: string[];
  try {
    allVerses = await loadTranslation(version);
  } catch {
    throw translationUnavailable(version);
  }

  const searchWords = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!searchWords.length) return { results: [], total: 0 };

  const matches: BibleSearchResult[] = [];
  let position = 0;
  for (let bookId = 1; bookId <= CHAPTER_VERSE_COUNTS.length; bookId++) {
    const chapters = CHAPTER_VERSE_COUNTS[bookId - 1];
    for (let chapter = 1; chapter <= chapters.length; chapter++) {
      for (let verse = 1; verse <= chapters[chapter - 1]; verse++) {
        const text = allVerses[position++];
        const lowercased = text.toLowerCase();
        if (searchWords.every((word) => lowercased.includes(word))) {
          matches.push({ bookId, chapter, verse, text });
        }
      }
    }
  }

  const pageStart = (page - 1) * SEARCH_PAGE_SIZE;
  return {
    results: matches.slice(pageStart, pageStart + SEARCH_PAGE_SIZE),
    total: matches.length,
  };
};
