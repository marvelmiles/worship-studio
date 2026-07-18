// The offline Bible, from the ground up:
//
// 1. The holy-bible npm package (MIT license) ships each public-domain
//    translation as ONE flat array of 31,103 verse strings in reading order:
//    Genesis 1:1 is position 0, Revelation 22:21 is the last position. The
//    data itself has no book/chapter structure.
// 2. src/data/bibleLayout.ts (generated — see scripts/generate-bible-layout.mjs)
//    provides that structure: how many verses each chapter has, and where a
//    chapter starts inside the flat array.
// 3. This module combines the two. It lazy-loads a translation's verse array
//    the first time it's needed (each translation is its own code-split
//    chunk, precached by the service worker) and answers two questions:
//    "give me this chapter's verses" and "which verses contain these words?".
//    Nothing ever touches the network at runtime.

import type { BibleVerse, BibleVersionId } from "../../../types";
import {
  CHAPTER_VERSE_COUNTS,
  chapterStartPosition,
} from "../../../data/bibleLayout";

/** Each supported translation and the bundled verse file it comes from. */
const VERSE_FILES: Record<
  BibleVersionId,
  () => Promise<{ default: string[] }>
> = {
  KJV: () => import("holy-bible/bibles/kjv.json"),
  ASV: () => import("holy-bible/bibles/asv.json"),
};

/**
 * Raw verse strings need two clean-ups: the ASV wraps translator-supplied
 * words in `like this' quote marks, and both translations use "[]" for the
 * one verse number that is empty in this versification (3 John 1:15).
 */
const cleanVerseText = (raw: string): string =>
  raw === "[]" ? "" : raw.replace(/`([^`]*?)'/g, "$1").trim();

/** Translations already loaded (and cleaned) this session. */
const loadedTranslations = new Map<BibleVersionId, Promise<string[]>>();

function loadTranslation(version: BibleVersionId): Promise<string[]> {
  const loadVerseFile = VERSE_FILES[version] || VERSE_FILES.KJV;
  let loading = loadedTranslations.get(version);
  if (!loading) {
    loading = loadVerseFile().then((file) => file.default.map(cleanVerseText));
    // Forget failed loads so trying again re-attempts the import.
    loading.catch(() => loadedTranslations.delete(version));
    loadedTranslations.set(version, loading);
  }
  return loading;
}

export class BibleLoadError extends Error {
  offline: boolean;

  constructor(message: string, offline: boolean) {
    super(message);
    this.offline = offline;
  }
}

/** A translation chunk failed to load — usually offline before first cache. */
function translationUnavailable(version: BibleVersionId): BibleLoadError {
  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  return new BibleLoadError(
    offline
      ? `You're offline and the ${version} text hasn't been downloaded yet. Connect once and it stays available offline.`
      : `Couldn't load the ${version} text. Reload the app and try again.`,
    offline,
  );
}

/** All verses of one chapter, e.g. getChapterVerses("KJV", 43, 3) → John 3. */
export async function getChapterVerses(
  version: BibleVersionId,
  bookId: number,
  chapter: number,
  _signal?: AbortSignal,
): Promise<BibleVerse[]> {
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
}

export interface BibleSearchResult {
  bookId: number;
  chapter: number;
  verse: number;
  text: string;
}

export const SEARCH_PAGE_SIZE = 40;

/**
 * Finds every verse that contains all of the query's words
 * (case-insensitive), returned in reading order one page at a time so the
 * UI can "load more". Scanning the whole translation takes only a few
 * milliseconds, so each page request simply searches again.
 */
export async function searchBibleVerses(
  version: BibleVersionId,
  query: string,
  page: number,
  _signal?: AbortSignal,
): Promise<{ results: BibleSearchResult[]; total: number }> {
  let allVerses: string[];
  try {
    allVerses = await loadTranslation(version);
  } catch {
    throw translationUnavailable(version);
  }

  const searchWords = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!searchWords.length) return { results: [], total: 0 };

  // The flat array is in reading order, so walking it while counting through
  // the layout table (book by book, chapter by chapter, verse by verse)
  // tells us the reference of every verse as we pass it.
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
}
