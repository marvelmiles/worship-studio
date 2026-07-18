// Helpers for the "don't save the same passage twice" rule. A saved passage
// counts as a duplicate when it points at the same scripture (translation +
// verse range). Whether its CONTENT also matches decides what happens next:
// identical saves are blocked, differing ones ask the user to overwrite or
// keep both as a numbered copy.

import type { PassageRange, ScripturePassage } from "../../../types";
import type { SavePassageOptions } from "../../../store/slices/scripturesSlice";

const isSameRange = (a: PassageRange, b: PassageRange): boolean =>
  a.bookId === b.bookId &&
  a.chapter === b.chapter &&
  a.verseStart === b.verseStart &&
  a.verseEnd === b.verseEnd;

/** Saved passages (not trashed, not quick-present) covering the same scripture. */
export function findSavedDuplicates(
  saved: ScripturePassage[],
  options: SavePassageOptions,
): ScripturePassage[] {
  return saved.filter(
    (passage) =>
      !passage.quick &&
      !passage.deleted &&
      passage.version === options.version &&
      isSameRange(passage.range, options.range),
  );
}

/** True when a saved passage already holds exactly what would be saved. */
export function hasSameContent(passage: ScripturePassage, options: SavePassageOptions): boolean {
  return (
    passage.versesPerSlide === (options.versesPerSlide ?? 1) &&
    passage.showVerseNumbers === (options.showVerseNumbers ?? true) &&
    passage.showReference === (options.showReference ?? true) &&
    passage.verses.length === options.verses.length &&
    passage.verses.every((verse, i) => {
      const incoming = options.verses[i];
      return verse.v === incoming.v && verse.t === incoming.t;
    })
  );
}

/**
 * First free numbered title for a duplicate copy:
 * "Matthew 1:1-4 (KJV)" → "Matthew 1:1-4 (KJV) (1)", then "(2)", …
 */
export function nextCopyTitle(baseTitle: string, saved: ScripturePassage[]): string {
  const takenTitles = new Set(
    saved.filter((p) => !p.quick && !p.deleted).map((p) => p.title),
  );
  let copyNumber = 1;
  while (takenTitles.has(`${baseTitle} (${copyNumber})`)) copyNumber++;
  return `${baseTitle} (${copyNumber})`;
}
