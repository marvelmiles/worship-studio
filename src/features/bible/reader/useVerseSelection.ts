import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BibleVerse } from "../../../types";
import type { VerseSpan } from "../lib/reference";

export interface VerseSelection {
  anchor: number;
  focus: number;
}

interface UseVerseSelectionOptions {
  verses: BibleVerse[];
  focusRange?: VerseSpan | null;
  /** Changes whenever the reader moves to another chapter. */
  chapterKey: string;
  isLoading: boolean;
}

const isTextEntry = (target: EventTarget | null): boolean => {
  const element = target as HTMLElement | null;
  return Boolean(
    element &&
    (element.tagName === "INPUT" ||
      element.tagName === "TEXTAREA" ||
      element.isContentEditable),
  );
};

export const useVerseSelection = ({
  verses,
  focusRange,
  chapterKey,
  isLoading,
}: UseVerseSelectionOptions) => {
  const [selection, setSelection] = useState<VerseSelection | null>(null);
  const verseRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const pendingScrollVerse = useRef<number | null>(null);
  const pendingSelection = useRef<VerseSelection | null>(null);

  const selectionStart = selection
    ? Math.min(selection.anchor, selection.focus)
    : null;
  const selectionEnd = selection
    ? Math.max(selection.anchor, selection.focus)
    : null;

  const registerVerseRef = useCallback(
    (verse: number, element: HTMLDivElement | null) => {
      verseRefs.current[verse] = element;
    },
    [],
  );

  const scrollToVerse = useCallback(
    (verse: number, block: ScrollLogicalPosition = "center") => {
      verseRefs.current[verse]?.scrollIntoView({ behavior: "smooth", block });
    },
    [],
  );

  // A jump to another chapter carries its selection over, because the verses arrive after the navigation.
  const selectAfterNavigation = useCallback(
    (next: VerseSelection, scrollTo: number) => {
      pendingSelection.current = next;
      pendingScrollVerse.current = scrollTo;
    },
    [],
  );

  useEffect(() => {
    setSelection(pendingSelection.current);
    pendingSelection.current = null;
  }, [chapterKey]);

  useEffect(() => {
    if (!focusRange) return;
    setSelection({ anchor: focusRange.start, focus: focusRange.end });
    pendingScrollVerse.current = focusRange.start;
  }, [focusRange, chapterKey]);

  useEffect(() => {
    const target = pendingScrollVerse.current;
    if (target === null || isLoading || !verses.length) return;
    pendingScrollVerse.current = null;
    scrollToVerse(target);
  }, [isLoading, verses, scrollToVerse]);

  const selectedVerses = useMemo(() => {
    if (selectionStart === null || selectionEnd === null) return [];
    return verses.filter(
      (verse) => verse.v >= selectionStart && verse.v <= selectionEnd,
    );
  }, [verses, selectionStart, selectionEnd]);

  const isAllSelected =
    verses.length > 0 &&
    selectionStart !== null &&
    selectionEnd !== null &&
    selectionStart <= verses[0].v &&
    selectionEnd >= verses[verses.length - 1].v;

  const toggleSelectAll = useCallback(() => {
    if (!verses.length) return;
    setSelection(
      isAllSelected
        ? null
        : { anchor: verses[0].v, focus: verses[verses.length - 1].v },
    );
  }, [isAllSelected, verses]);

  const selectVerse = useCallback((verse: number, extend: boolean) => {
    setSelection((previous) => {
      if (previous && extend) return { ...previous, focus: verse };
      if (previous && previous.anchor === verse && previous.focus === verse) {
        return null;
      }
      return { anchor: verse, focus: verse };
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTextEntry(event.target)) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
        event.preventDefault();
        toggleSelectAll();
        return;
      }
      const isGrowKey = event.key === "ArrowUp" || event.key === "ArrowDown";
      if (!event.shiftKey || !isGrowKey || !selection || !verses.length) return;
      const position = verses.findIndex((verse) => verse.v === selection.focus);
      if (position < 0) return;
      const nextPosition = Math.max(
        0,
        Math.min(
          verses.length - 1,
          position + (event.key === "ArrowDown" ? 1 : -1),
        ),
      );
      const nextVerse = verses[nextPosition].v;
      event.preventDefault();
      if (nextVerse === selection.focus) return;
      setSelection({ ...selection, focus: nextVerse });
      scrollToVerse(nextVerse, "nearest");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selection, verses, toggleSelectAll, scrollToVerse]);

  return {
    selection,
    selectionStart,
    selectionEnd,
    selectedVerses,
    isAllSelected,
    clearSelection: () => setSelection(null),
    setSelection,
    selectVerse,
    toggleSelectAll,
    selectAfterNavigation,
    registerVerseRef,
    scrollToVerse,
  };
};
