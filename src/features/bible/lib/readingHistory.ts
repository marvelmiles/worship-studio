// Log of chapters and verses the user has actually read, newest first, so the
// dashboard can list each one as its own activity. A chapter read (no verse)
// and a verse read of the same chapter are distinct entries; re-reading an
// entry bumps it to the top instead of duplicating it. Stored in localStorage.

import { loadReadingPosition } from "./readingPosition";

export interface ReadingEvent {
  bookId: number;
  chapter: number;
  /** Verse focused during the read, or null for a whole-chapter read. */
  verse: number | null;
  at: string;
}

const STORAGE_KEY = "ws:bible-reading-history";
const MAX_ENTRIES = 50;

/**
 * Dedupe key. A chapter read and a verse-1 read are the same activity (verse 1
 * is where a chapter starts), but the stored entry keeps the verse the user's
 * latest interaction actually had — "Numbers 1:1" when they selected or read
 * aloud that verse, "Numbers 1" when they just opened the chapter.
 */
function eventKey(bookId: number, chapter: number, verse: number | null): string {
  return `${bookId}:${chapter}:${verse === 1 ? 0 : (verse ?? 0)}`;
}

function isValid(event: ReadingEvent): boolean {
  return (
    event.bookId >= 1 &&
    event.bookId <= 66 &&
    event.chapter >= 1 &&
    (event.verse === null || event.verse >= 1) &&
    typeof event.at === "string"
  );
}

export function loadReadingHistory(): ReadingEvent[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const events = JSON.parse(stored) as ReadingEvent[];
      if (Array.isArray(events)) {
        // Entries are newest first, so keeping the first of each key keeps
        // the form of the user's latest interaction.
        const seen = new Set<string>();
        return events.filter(isValid).filter((e) => {
          const key = eventKey(e.bookId, e.chapter, e.verse);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }
    }
  } catch {
    /* corrupt or unavailable storage — treat as no history */
  }
  // Users from before the history log existed still get their last position.
  const last = loadReadingPosition();
  if (last.at) {
    return [
      { bookId: last.bookId, chapter: last.chapter, verse: last.verse ?? null, at: last.at },
    ];
  }
  return [];
}

export function recordReading(position: {
  bookId: number;
  chapter: number;
  verse?: number | null;
}): void {
  const verse = position.verse ?? null;
  try {
    const key = eventKey(position.bookId, position.chapter, verse);
    const history = loadReadingHistory().filter(
      (e) => eventKey(e.bookId, e.chapter, e.verse) !== key
    );
    history.unshift({
      bookId: position.bookId,
      chapter: position.chapter,
      verse,
      at: new Date().toISOString(),
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, MAX_ENTRIES)));
  } catch {
    /* non-fatal — the dashboard just won't list this read */
  }
}
