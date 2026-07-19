import type { BibleVerse, BibleVersionId, PassageRange } from "../../../types";
import type { ScriptureSelection } from "../../../store/useStore";
import { bookById } from "../../../data/bibleBooks";

/**
 * Builds the payload the presenter and the slide editor both take, from the
 * pieces every surface already has: a reference and the chapter's verses.
 *
 * Every place that can present scripture (the reader's selection bar, a
 * reference jump, a search result) funnels through here so they agree on what
 * a passage is: verses clipped to the range, in order, with the range's own
 * bounds trimmed to the verses that actually exist. Returns null when the
 * range names nothing presentable, which callers treat as "do nothing".
 */
export function buildScriptureSelection({
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
  /** Defaults to a single-verse range. */
  verseEnd?: number;
  /** The chapter's verses (or any superset); clipped to the range here. */
  verses: BibleVerse[];
}): ScriptureSelection | null {
  const book = bookById(bookId);
  if (!book) return null;

  const start = Math.min(verseStart, verseEnd ?? verseStart);
  const end = Math.max(verseStart, verseEnd ?? verseStart);
  const selected = verses.filter((v) => v.v >= start && v.v <= end);
  if (!selected.length) return null;

  // The reference follows the verses actually found, so a range that overshoots
  // the chapter never labels slides with a verse that isn't on them.
  const range: PassageRange = {
    bookId,
    bookName: book.name,
    chapter,
    verseStart: selected[0].v,
    verseEnd: selected[selected.length - 1].v,
  };
  return { version, range, verses: selected };
}
