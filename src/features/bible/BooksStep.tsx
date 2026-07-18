import { useMemo, useState } from "react";
import { Play } from "lucide-react";
import type { BibleVersionId } from "../../types";
import { BIBLE_BOOKS, bookById } from "../../data/bibleBooks";
import { C, DISPLAY, UI } from "../../theme/tokens";
import { Btn } from "../../components/ui/Button";
import { SearchInput } from "../../components/ui/SearchInput";
import { useBibleSearch } from "./useBibleSearch";
import { tileStyle } from "./tileStyle";
import type { ReadingPosition } from "./lib/readingPosition";

/**
 * First step of the Bible read tab: the Old/New Testament book grid, a
 * "continue where you left off" shortcut, and a combined search box that
 * filters book names AND finds verses containing the typed words.
 */
export function BooksStep({
  position,
  version,
  continueLabel,
  onOpenBook,
  onContinueReading,
  onOpenSearchResult,
}: {
  position: ReadingPosition;
  version: BibleVersionId;
  /** e.g. "John 3" — omitted when there is nothing to continue. */
  continueLabel: string | null;
  onOpenBook: (bookId: number) => void;
  onContinueReading: () => void;
  onOpenSearchResult: (bookId: number, chapter: number, verse: number) => void;
}) {
  const [query, setQuery] = useState("");
  const search = useBibleSearch(version, query);

  const matchingBooks = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return BIBLE_BOOKS;
    return BIBLE_BOOKS.filter(
      (b) => b.name.toLowerCase().includes(term) || b.aliases.some((a) => a.startsWith(term))
    );
  }, [query]);

  const testaments: { label: string; key: "old" | "new" }[] = [
    { label: "Old Testament", key: "old" },
    { label: "New Testament", key: "new" },
  ];

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div className="ws-row-wrap" style={{ marginBottom: 16 }}>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search books or words — e.g. Psalms, living water…"
        />
        {continueLabel && (
          <Btn variant="ghost" onClick={onContinueReading} title="Pick up where you left off">
            <Play size={14} />
            Continue — {continueLabel}
          </Btn>
        )}
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingRight: 6, paddingBottom: 12 }}>
        {matchingBooks.length === 0 && !search.enabled && (
          <p style={{ fontFamily: UI, color: C.dim, textAlign: "center", padding: 30 }}>
            No book matches "{query}".
          </p>
        )}
        {testaments.map(({ label, key }) => {
          const books = matchingBooks.filter((b) => b.testament === key);
          if (!books.length) return null;
          return (
            <div key={key} style={{ marginBottom: 20 }}>
              <div className="ws-section-label" style={{ margin: "6px 0 10px" }}>
                {query.trim() ? `${label} — matching books` : label}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))",
                  gap: 8,
                }}
              >
                {books.map((b) => {
                  const active = b.id === position.bookId;
                  return (
                    <button
                      key={b.id}
                      onClick={() => onOpenBook(b.id)}
                      style={{
                        ...tileStyle(active),
                        textAlign: "left",
                        padding: "11px 13px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 3,
                      }}
                    >
                      <span className="ws-ellipsis" style={{ fontFamily: DISPLAY, fontSize: 15, maxWidth: "100%" }}>
                        {b.name}
                      </span>
                      <span style={{ fontFamily: UI, fontSize: 11, fontWeight: 500, color: active ? C.goldSoft : C.dim }}>
                        {b.chapters} chapter{b.chapters === 1 ? "" : "s"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {search.enabled && (
          <div style={{ marginBottom: 20 }}>
            <div className="ws-section-label" style={{ margin: "6px 0 10px" }}>
              Verses matching "{search.term}"
              {search.total > 0 ? ` — ${search.total.toLocaleString()} found` : ""}
            </div>
            {search.loading && search.results.length === 0 && (
              <p style={{ fontFamily: UI, fontSize: 13, color: C.dim, padding: "10px 2px" }}>
                Searching {version}…
              </p>
            )}
            {search.error && (
              <p style={{ fontFamily: UI, fontSize: 13, color: C.danger, padding: "10px 2px" }}>
                {search.error}
              </p>
            )}
            {!search.loading && !search.error && search.results.length === 0 && (
              <p style={{ fontFamily: UI, fontSize: 13, color: C.dim, padding: "10px 2px" }}>
                No verses in {version} contain "{search.term}".
              </p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {search.results.map((result) => {
                const resultBook = bookById(result.bookId);
                if (!resultBook) return null;
                return (
                  <button
                    key={`${result.bookId}:${result.chapter}:${result.verse}`}
                    onClick={() => onOpenSearchResult(result.bookId, result.chapter, result.verse)}
                    title={`Open ${resultBook.name} ${result.chapter}:${result.verse}`}
                    style={{
                      textAlign: "left",
                      padding: "10px 13px",
                      borderRadius: 10,
                      cursor: "pointer",
                      border: `1px solid ${C.border}`,
                      background: C.raise,
                    }}
                  >
                    <span
                      style={{
                        display: "block",
                        fontFamily: UI,
                        fontSize: 12.5,
                        fontWeight: 700,
                        color: C.goldSoft,
                        marginBottom: 3,
                      }}
                    >
                      {resultBook.name} {result.chapter}:{result.verse}
                    </span>
                    <span style={{ fontFamily: UI, fontSize: 13.5, lineHeight: 1.55, color: C.sub }}>
                      {highlightSearchWords(snippetAroundFirstMatch(result.text, search.term), search.term)}
                    </span>
                  </button>
                );
              })}
            </div>
            {search.hasMore && (
              <div style={{ marginTop: 12, textAlign: "center" }}>
                <Btn variant="ghost" onClick={search.loadMore} disabled={search.loading}>
                  {search.loading ? "Loading…" : `Load more (${search.results.length} of ${search.total.toLocaleString()})`}
                </Btn>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Escapes regex metacharacters so search words can be matched literally. */
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Wraps occurrences of the search words in a gold highlight. */
function highlightSearchWords(text: string, term: string) {
  const words = term.split(/\s+/).filter(Boolean).map(escapeRegExp);
  if (!words.length) return text;
  const splitter = new RegExp(`(${words.join("|")})`, "gi");
  const isMatch = new RegExp(`^(?:${words.join("|")})$`, "i");
  return text.split(splitter).map((part, i) =>
    isMatch.test(part) ? (
      <span key={i} style={{ color: C.goldSoft, fontWeight: 700 }}>
        {part}
      </span>
    ) : (
      part
    )
  );
}

/** Trims long verse text to a window around the first search match. */
function snippetAroundFirstMatch(text: string, term: string, span = 180): string {
  if (text.length <= span) return text;
  const firstWord = term.split(/\s+/).filter(Boolean)[0] || "";
  const at = firstWord ? text.toLowerCase().indexOf(firstWord.toLowerCase()) : -1;
  if (at <= span / 2) return `${text.slice(0, span)}…`;
  const start = Math.max(0, at - Math.floor(span / 2));
  const end = Math.min(text.length, start + span);
  return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
}
