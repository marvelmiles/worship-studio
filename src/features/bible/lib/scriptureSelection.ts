import type { BibleVerse, BibleVersionId, PassageRange } from "../../../types";
import type { ScriptureSelection } from "../../../store/useStore";
import { bookById } from "../../../data/bibleBooks";

export const buildScriptureSelection = ({
  version,
  bookId,
  chapter,
  verseStart,
  verseEnd,
  verses,
}: {
  version: BibleVersionId;
  bookId: number;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
  verses: BibleVerse[];
}): ScriptureSelection | null => {
  const book = bookById(bookId);
  if (!book) return null;

  const start = Math.min(verseStart, verseEnd ?? verseStart);
  const end = Math.max(verseStart, verseEnd ?? verseStart);
  const selected = verses.filter((v) => v.v >= start && v.v <= end);
  if (!selected.length) return null;

  const range: PassageRange = {
    bookId,
    bookName: book.name,
    chapter,
    verseStart: selected[0].v,
    verseEnd: selected[selected.length - 1].v,
  };
  return { version, range, verses: selected };
};
