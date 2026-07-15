import { useCallback, useEffect, useState } from "react";
import type { BibleVersionId } from "../../types";
import { searchBibleVerses, type BibleSearchResult } from "./lib/bibleApi";

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 450;

/**
 * Debounced full-text verse search. Results accumulate across pages;
 * changing the query or version starts over from page one.
 */
export function useBibleSearch(version: BibleVersionId, query: string) {
  const term = query.trim();
  const enabled = term.length >= MIN_QUERY_LENGTH;

  const [results, setResults] = useState<BibleSearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setResults([]);
    setTotal(0);
    setPage(1);
    setError(null);
  }, [term, version]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    // Fresh queries debounce while the user types; load-more fires at once.
    const timer = window.setTimeout(
      () => {
        setLoading(true);
        searchBibleVerses(version, term, page, controller.signal)
          .then((res) => {
            if (controller.signal.aborted) return;
            setResults((prev) => (page === 1 ? res.results : [...prev, ...res.results]));
            setTotal(res.total);
            setLoading(false);
          })
          .catch((err: Error) => {
            if (controller.signal.aborted || err.name === "AbortError") return;
            setError(err.message);
            setLoading(false);
          });
      },
      page === 1 ? DEBOUNCE_MS : 0
    );
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, term, version, page]);

  const loadMore = useCallback(() => setPage((p) => p + 1), []);

  return {
    enabled,
    term,
    results,
    total,
    loading,
    error,
    hasMore: enabled && results.length < total,
    loadMore,
  };
}
