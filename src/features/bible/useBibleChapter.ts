import { useCallback, useEffect, useState } from "react";
import type { BibleVerse, BibleVersionId } from "../../types";
import { getChapterVerses } from "./lib/offlineBible";

interface ChapterState {
  verses: BibleVerse[];
  loading: boolean;
  error: string | null;
}

export function useBibleChapter(
  version: BibleVersionId,
  bookId: number,
  chapter: number,
) {
  const [state, setState] = useState<ChapterState>({
    verses: [],
    loading: true,
    error: null,
  });
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setState((prev) => ({ ...prev, loading: true, error: null }));
    getChapterVerses(version, bookId, chapter, controller.signal)
      .then((verses) => {
        if (!controller.signal.aborted)
          setState({ verses, loading: false, error: null });
      })
      .catch((err: Error) => {
        if (!controller.signal.aborted)
          setState({ verses: [], loading: false, error: err.message });
      });
    return () => controller.abort();
  }, [version, bookId, chapter, attempt]);

  return { ...state, retry };
}
