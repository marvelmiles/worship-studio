// Remembers where the reader stopped, so the Bible page can offer
// "Continue — John 3:16" across visits. The verse is the last one the user
// had selected in the reader; when they read without selecting anything we
// only remember the book and chapter. Stored in localStorage; falls back to
// John 3 for first-time readers.

export interface ReadingPosition {
  bookId: number;
  chapter: number;
  /** Last verse selected in this chapter, or null when none was. */
  verse?: number | null;
  /** When the reader was last here (ISO). Missing until the Bible page is first visited. */
  at?: string;
}

const STORAGE_KEY = "ws:bible-position";

const DEFAULT_POSITION: ReadingPosition = { bookId: 43, chapter: 3, verse: null };

export function loadReadingPosition(): ReadingPosition {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const position = JSON.parse(stored) as ReadingPosition;
      if (position.bookId >= 1 && position.bookId <= 66 && position.chapter >= 1) {
        const verse = typeof position.verse === "number" && position.verse >= 1 ? position.verse : null;
        const at = typeof position.at === "string" ? position.at : undefined;
        return { bookId: position.bookId, chapter: position.chapter, verse, at };
      }
    }
  } catch {
    /* corrupt or unavailable storage — start from the default */
  }
  return DEFAULT_POSITION;
}

export function saveReadingPosition(position: ReadingPosition): void {
  try {
    const stamped: ReadingPosition = { ...position, at: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stamped));
  } catch {
    /* non-fatal — the reader just won't remember its place */
  }
}
