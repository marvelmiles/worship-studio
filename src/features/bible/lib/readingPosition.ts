export interface ReadingPosition {
  bookId: number;
  chapter: number;
  verse?: number | null;
  at?: string;
}

const STORAGE_KEY = "ws:bible-position";

const DEFAULT_POSITION: ReadingPosition = {
  bookId: 43,
  chapter: 3,
  verse: null,
};

export const loadReadingPosition = (): ReadingPosition => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const position = JSON.parse(stored) as ReadingPosition;
      if (
        position.bookId >= 1 &&
        position.bookId <= 66 &&
        position.chapter >= 1
      ) {
        const verse =
          typeof position.verse === "number" && position.verse >= 1
            ? position.verse
            : null;
        const at = typeof position.at === "string" ? position.at : undefined;
        return {
          bookId: position.bookId,
          chapter: position.chapter,
          verse,
          at,
        };
      }
    }
  } catch {}
  return DEFAULT_POSITION;
};

export const saveReadingPosition = (position: ReadingPosition): void => {
  try {
    const stamped: ReadingPosition = {
      ...position,
      at: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stamped));
  } catch {}
};
