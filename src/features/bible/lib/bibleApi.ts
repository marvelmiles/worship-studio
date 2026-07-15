import type { BibleVerse, BibleVersionId } from "../../../types";
import { sGet, sPut } from "../../../lib/storage";

const API_BASE = "https://bolls.life";

interface CachedChapter {
  id: string;
  verses: BibleVerse[];
  cachedAt: string;
}

interface ApiVerse {
  verse: number;
  text: string;
}

const chapterKey = (version: BibleVersionId, bookId: number, chapter: number) =>
  `${version}:${bookId}:${chapter}`;

const decodeEntities = (text: string): string =>
  text
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&");

/**
 * Embedded section headings (NIV puts them inside the verse text, before a
 * <br/>) read as short title-case fragments without ending punctuation —
 * unlike poetry lines, which carry sentence punctuation or lowercase words.
 */
const isLikelyHeading = (segment: string): boolean => {
  const s = segment.trim();
  if (!s || s.length > 70) return false;
  if (/[.,;:!?…"'’”)\]—-]$/.test(s)) return false;
  const words = s.split(/\s+/);
  const capitalized = words.filter((w) => /^[A-Z0-9]/.test(w)).length;
  return capitalized / words.length >= 0.6;
};

/**
 * bolls.life text carries markup: <S> Strong's numbers and <sup> footnotes
 * (dropped with their content), <br/> line breaks (kept as newlines so poetry
 * renders as verse lines), plus inline tags like <i> (content kept).
 */
const stripMarkup = (html: string): string => {
  const cleaned = html
    .replace(/<S>[\s\S]*?<\/S>/gi, "")
    .replace(/<sup>[\s\S]*?<\/sup>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n");
  const lines = cleaned
    .split("\n")
    .map((line) => decodeEntities(line.replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0);
  while (lines.length > 1 && isLikelyHeading(lines[0])) lines.shift();
  return lines.join("\n");
};

export class BibleFetchError extends Error {
  offline: boolean;

  constructor(message: string, offline: boolean) {
    super(message);
    this.offline = offline;
  }
}

/**
 * Read-through chapter loader: serves from the IndexedDB cache first so
 * previously read chapters keep working offline, otherwise fetches from the
 * bolls.life API and caches the result.
 */
export async function getChapterVerses(
  version: BibleVersionId,
  bookId: number,
  chapter: number,
  signal?: AbortSignal
): Promise<BibleVerse[]> {
  const key = chapterKey(version, bookId, chapter);
  const cached = await sGet<CachedChapter>("bible", key);
  if (cached?.verses?.length) return cached.verses;

  let rows: ApiVerse[];
  try {
    const res = await fetch(`${API_BASE}/get-text/${version}/${bookId}/${chapter}/`, { signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    rows = (await res.json()) as ApiVerse[];
  } catch (err) {
    if ((err as Error)?.name === "AbortError") throw err;
    const offline = typeof navigator !== "undefined" && !navigator.onLine;
    throw new BibleFetchError(
      offline
        ? "You're offline and this chapter isn't downloaded yet. Chapters you've read are available offline."
        : "Couldn't load this chapter. Check your connection and try again.",
      offline
    );
  }

  const verses = rows
    .map((row) => ({ v: row.verse, t: stripMarkup(row.text) }))
    .filter((row) => row.t.length > 0)
    .sort((a, b) => a.v - b.v);

  if (!verses.length) {
    throw new BibleFetchError("This chapter returned no verses.", false);
  }

  void sPut<CachedChapter>("bible", { id: key, verses, cachedAt: new Date().toISOString() });
  return verses;
}
