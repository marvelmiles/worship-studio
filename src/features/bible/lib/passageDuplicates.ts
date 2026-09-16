import type { PassageRange, ScripturePassage } from "../../../types";
import type { SavePassageOptions } from "../../../store/slices/scripturesSlice";

const isSameRange = (a: PassageRange, b: PassageRange): boolean =>
  a.bookId === b.bookId &&
  a.chapter === b.chapter &&
  a.verseStart === b.verseStart &&
  a.verseEnd === b.verseEnd;

export const findSavedDuplicates = (
  saved: ScripturePassage[],
  options: SavePassageOptions,
): ScripturePassage[] => {
  return saved.filter(
    (passage) =>
      !passage.quick &&
      !passage.deleted &&
      passage.version === options.version &&
      isSameRange(passage.range, options.range),
  );
};

export const hasSameContent = (
  passage: ScripturePassage,
  options: SavePassageOptions,
): boolean => {
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
};

export const nextCopyTitle = (
  baseTitle: string,
  saved: ScripturePassage[],
): string => {
  const takenTitles = new Set(
    saved.filter((p) => !p.quick && !p.deleted).map((p) => p.title),
  );
  let copyNumber = 1;
  while (takenTitles.has(`${baseTitle} (${copyNumber})`)) copyNumber++;
  return `${baseTitle} (${copyNumber})`;
};
