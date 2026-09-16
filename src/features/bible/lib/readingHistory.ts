import { loadReadingPosition } from "./readingPosition";

export interface ReadingEvent {
  bookId: number;
  chapter: number;
  verse: number | null;
  at: string;
}

const STORAGE_KEY = "ws:bible-reading-history";
const MAX_ENTRIES = 50;

const eventKey = (
  bookId: number,
  chapter: number,
  verse: number | null,
): string => {
  return `${bookId}:${chapter}:${verse === 1 ? 0 : (verse ?? 0)}`;
};

const isValid = (event: ReadingEvent): boolean => {
  return (
    event.bookId >= 1 &&
    event.bookId <= 66 &&
    event.chapter >= 1 &&
    (event.verse === null || event.verse >= 1) &&
    typeof event.at === "string"
  );
};

export const loadReadingHistory = (): ReadingEvent[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const events = JSON.parse(stored) as ReadingEvent[];
      if (Array.isArray(events)) {
        const seen = new Set<string>();
        return events.filter(isValid).filter((e) => {
          const key = eventKey(e.bookId, e.chapter, e.verse);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }
    }
  } catch {}
  const last = loadReadingPosition();
  if (last.at) {
    return [
      {
        bookId: last.bookId,
        chapter: last.chapter,
        verse: last.verse ?? null,
        at: last.at,
      },
    ];
  }
  return [];
};

export const recordReading = (position: {
  bookId: number;
  chapter: number;
  verse?: number | null;
}): void => {
  const verse = position.verse ?? null;
  try {
    const key = eventKey(position.bookId, position.chapter, verse);
    const history = loadReadingHistory().filter(
      (e) => eventKey(e.bookId, e.chapter, e.verse) !== key,
    );
    history.unshift({
      bookId: position.bookId,
      chapter: position.chapter,
      verse,
      at: new Date().toISOString(),
    });
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(history.slice(0, MAX_ENTRIES)),
    );
  } catch {}
};
