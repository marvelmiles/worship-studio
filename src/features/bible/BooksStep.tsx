import { useMemo, useState, type ReactNode } from "react";
import { ArrowRight, Play } from "lucide-react";
import type { BibleVersionId } from "../../types";
import { BIBLE_BOOKS, bookById } from "../../data/bibleBooks";
import { colors, DISPLAY, UI } from "../../theme/tokens";
import { useUITheme } from "../../theme/ThemeProvider";
import type { ScriptureSelection } from "../../store/useStore";
import { Button } from "../../components/ui/Button";
import { SearchInput } from "../../components/ui/SearchInput";
import { Spinner } from "../../components/ui/Spinner";
import { useBibleSearch } from "./useBibleSearch";
import { useBibleChapter } from "./useBibleChapter";
import { PresentButton } from "./PresentButton";
import { tileStyle } from "./tileStyle";
import {
  parseReference,
  referenceSpan,
  type ParsedReference,
  type VerseSpan,
} from "./lib/reference";
import { buildScriptureSelection } from "./lib/scriptureSelection";
import type { ReadingPosition } from "./lib/readingPosition";

/**
 * First step of the Bible read tab: the Old/New Testament book grid, a
 * "continue where you left off" shortcut, and a combined search box that
 * reads references ("job 2", "job 2:3", "jb 2:3-5"), filters book names and
 * aliases, AND finds verses containing the typed words.
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
  /** e.g. "John 3", omitted when there is nothing to continue. */
  continueLabel: string | null;
  onOpenBook: (bookId: number) => void;
  onContinueReading: () => void;
  onOpenSearchResult: (
    bookId: number,
    chapter: number,
    span: VerseSpan,
  ) => void;
}) {
  const [query, setQuery] = useState("");

  /** Set when the query reads as a reference with a chapter, e.g. "job 2:3-5". */
  const reference = useMemo(() => {
    const parsed = parseReference(query);
    return parsed?.hasChapter ? parsed : null;
  }, [query]);

  // A reference is an exact address, so the word search would only add noise
  // ("job 2:3" appears in no verse); it stays off until the query is prose.
  const search = useBibleSearch(version, reference ? "" : query);

  const matchingBooks = useMemo(() => {
    // "job 2:3" keeps Job's tile on screen so the chapter grid is one tap away.
    if (reference) return [reference.book];
    const term = query.trim().toLowerCase();
    if (!term) return BIBLE_BOOKS;
    return BIBLE_BOOKS.filter(
      (b) =>
        b.name.toLowerCase().includes(term) ||
        b.aliases.some((a) => a.startsWith(term)),
    );
  }, [query, reference]);

  const testaments: { label: string; key: "old" | "new" }[] = [
    { label: "Old Testament", key: "old" },
    { label: "New Testament", key: "new" },
  ];

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div className="ws-row-wrap" style={{ marginBottom: 16 }}>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search a book, reference or words, like Psalms, Job 2:3-5 or living water"
        />
        {continueLabel && (
          <Button
            variant="ghost"
            onClick={onContinueReading}
            title="Pick up where you left off"
          >
            <Play size={14} />
            Continue: {continueLabel}
          </Button>
        )}
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          paddingRight: 6,
          paddingBottom: 12,
        }}
      >
        {reference && (
          <PassageJump
            reference={reference}
            version={version}
            // The whole reference travels through, so "Jn 2" opens the reader
            // with all of chapter 2 selected and "Jn 2:3-10" with verses 3-10.
            onOpen={() =>
              onOpenSearchResult(
                reference.book.id,
                reference.chapter,
                referenceSpan(reference),
              )
            }
          />
        )}
        {matchingBooks.length === 0 && !search.enabled && (
          <p
            style={{
              fontFamily: UI,
              color: colors.dim,
              textAlign: "center",
              padding: 30,
            }}
          >
            No book matches "{query}".
          </p>
        )}
        {testaments.map(({ label, key }) => {
          const books = matchingBooks.filter((b) => b.testament === key);
          if (!books.length) return null;
          return (
            <div key={key} style={{ marginBottom: 20 }}>
              <div
                className="ws-section-label"
                style={{ margin: "6px 0 10px" }}
              >
                {query.trim() ? `${label}: matching books` : label}
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
                      <span
                        className="ws-ellipsis"
                        style={{
                          fontFamily: DISPLAY,
                          fontSize: 15,
                          maxWidth: "100%",
                        }}
                      >
                        {b.name}
                      </span>
                      <span
                        style={{
                          fontFamily: UI,
                          fontSize: 11,
                          fontWeight: 500,
                          color: active ? colors.accentSoft : colors.dim,
                        }}
                      >
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
              {search.total > 0
                ? ` (${search.total.toLocaleString()} found)`
                : ""}
            </div>
            {search.loading && search.results.length === 0 && (
              <div style={{ padding: "14px 2px" }}>
                <Spinner size={20} />
              </div>
            )}
            {search.error && (
              <p
                style={{
                  fontFamily: UI,
                  fontSize: 13,
                  color: colors.danger,
                  padding: "10px 2px",
                }}
              >
                {search.error}
              </p>
            )}
            {!search.loading &&
              !search.error &&
              search.results.length === 0 && (
                <p
                  style={{
                    fontFamily: UI,
                    fontSize: 13,
                    color: colors.dim,
                    padding: "10px 2px",
                  }}
                >
                  No verses in {version} contain "{search.term}".
                </p>
              )}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {search.results.map((result) => {
                const resultBook = bookById(result.bookId);
                if (!resultBook) return null;
                return (
                  <ResultRow
                    key={`${result.bookId}:${result.chapter}:${result.verse}`}
                    onOpen={() =>
                      onOpenSearchResult(result.bookId, result.chapter, {
                        start: result.verse,
                        end: result.verse,
                      })
                    }
                    title={`Open ${resultBook.name} ${result.chapter}:${result.verse}`}
                    heading={`${resultBook.name} ${result.chapter}:${result.verse}`}
                    // The search result carries the verse text, so presenting it
                    // needs nothing more loaded.
                    selection={() =>
                      buildScriptureSelection({
                        version,
                        bookId: result.bookId,
                        chapter: result.chapter,
                        verseStart: result.verse,
                        verses: [{ v: result.verse, t: result.text }],
                      })
                    }
                    presentTitle={`Present ${resultBook.name} ${result.chapter}:${result.verse}`}
                  >
                    <span
                      style={{
                        fontFamily: UI,
                        fontSize: 13.5,
                        lineHeight: 1.55,
                        color: colors.sub,
                      }}
                    >
                      {highlightSearchWords(
                        snippetAroundFirstMatch(result.text, search.term),
                        search.term,
                      )}
                    </span>
                  </ResultRow>
                );
              })}
            </div>
            {search.hasMore && (
              <div style={{ marginTop: 12, textAlign: "center" }}>
                <Button
                  variant="ghost"
                  onClick={search.loadMore}
                  busy={search.loading}
                >
                  Load more ({search.results.length} of{" "}
                  {search.total.toLocaleString()})
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** "Job 2", "Job 2:3", "Job 2:3-5" — how the parsed reference reads back. */
function referenceLabel({
  book,
  chapter,
  verseStart,
  verseEnd,
}: ParsedReference): string {
  if (!verseStart) return `${book.name} ${chapter}`;
  const verses =
    !verseEnd || verseEnd === verseStart
      ? `${verseStart}`
      : `${verseStart}-${verseEnd}`;
  return `${book.name} ${chapter}:${verses}`;
}

/**
 * One clickable search hit: a reference heading, its text, and a Present
 * button. The row opens the reader; Present throws the passage straight on
 * screen without leaving the search, exactly as presenting a selection does in
 * the reader itself.
 */
function ResultRow({
  onOpen,
  title,
  heading,
  meta,
  selection,
  presentTitle,
  presentDisabled,
  emphasis,
  children,
}: {
  onOpen: () => void;
  title: string;
  heading: string;
  meta?: ReactNode;
  selection: () => ScriptureSelection | null;
  presentTitle: string;
  /** Set while the verses behind the selection aren't loaded yet. */
  presentDisabled?: boolean;
  /** The reference jump card, which leads the results. */
  emphasis?: boolean;
  children: ReactNode;
}) {
  const { colors, fonts } = useUITheme();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      title={title}
      style={{
        textAlign: "left",
        padding: emphasis ? "13px 15px" : "10px 13px",
        borderRadius: emphasis ? 12 : 10,
        cursor: "pointer",
        border: `1px solid ${emphasis ? colors.accentSoft : colors.border}`,
        background: colors.raise,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 4,
        }}
      >
        <span
          style={{
            fontFamily: emphasis ? fonts.display : fonts.ui,
            fontSize: emphasis ? 15.5 : 12.5,
            fontWeight: 700,
            color: colors.accentSoft,
          }}
        >
          {heading}
        </span>
        {meta}
        <span style={{ flex: 1 }} />
        <PresentButton
          selection={selection}
          title={presentTitle}
          disabled={presentDisabled}
        />
        <ArrowRight size={15} color={colors.dim} style={{ flexShrink: 0 }} />
      </div>
      {children}
    </div>
  );
}

/**
 * The "go straight there" card shown when the query is a reference. It renders
 * only while a reference is parsed, so the plain book grid never pays for
 * loading a translation.
 */
function PassageJump({
  reference,
  version,
  onOpen,
}: {
  reference: ParsedReference;
  version: BibleVersionId;
  onOpen: () => void;
}) {
  const { colors, fonts } = useUITheme();
  const { verses, loading, error } = useBibleChapter(
    version,
    reference.book.id,
    reference.chapter,
  );

  const { book, chapter, verseStart, verseEnd } = reference;
  // Verse references preview exactly what was asked for; a chapter-only
  // reference previews its opening verse but presents the whole chapter.
  const preview = verseStart
    ? verses.filter((v) => v.v >= verseStart && v.v <= (verseEnd ?? verseStart))
    : verses.slice(0, 1);

  return (
    <div style={{ marginBottom: 20 }}>
      <div className="ws-section-label" style={{ margin: "6px 0 10px" }}>
        Go to passage
      </div>
      <ResultRow
        onOpen={onOpen}
        title={`Open ${referenceLabel(reference)}`}
        heading={referenceLabel(reference)}
        emphasis
        meta={
          <span
            style={{
              fontFamily: fonts.ui,
              fontSize: 11.5,
              fontWeight: 600,
              color: colors.dim,
            }}
          >
            {version}
            {!verseStart && verses.length ? ` · ${verses.length} verses` : ""}
          </span>
        }
        presentTitle={`Present ${referenceLabel(reference)}`}
        presentDisabled={loading || Boolean(error) || !preview.length}
        // "Job 2:3-5" presents those verses; "Job 2" presents the whole chapter.
        selection={() => {
          const span = referenceSpan(reference);
          return buildScriptureSelection({
            version,
            bookId: book.id,
            chapter,
            verseStart: span.start,
            verseEnd: span.end,
            verses,
          });
        }}
      >
        {loading && <Spinner size={16} />}
        {error && (
          <span
            style={{ fontFamily: fonts.ui, fontSize: 13, color: colors.danger }}
          >
            {error}
          </span>
        )}
        {!loading && !error && (
          <span
            style={{
              fontFamily: fonts.ui,
              fontSize: 13.5,
              lineHeight: 1.55,
              color: colors.sub,
            }}
          >
            {preview.map((v) => v.t).join(" ")}
          </span>
        )}
      </ResultRow>
    </div>
  );
}

/** Escapes regex metacharacters so search words can be matched literally. */
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Highlights the search words inside a verse snippet. */
function highlightSearchWords(text: string, term: string) {
  const words = term.split(/\s+/).filter(Boolean).map(escapeRegExp);
  if (!words.length) return text;
  const splitter = new RegExp(`(${words.join("|")})`, "gi");
  const isMatch = new RegExp(`^(?:${words.join("|")})$`, "i");
  return text.split(splitter).map((part, i) =>
    isMatch.test(part) ? (
      <span key={i} style={{ color: colors.accentSoft, fontWeight: 700 }}>
        {part}
      </span>
    ) : (
      part
    ),
  );
}

/** Trims long verse text to a window around the first search match. */
function snippetAroundFirstMatch(
  text: string,
  term: string,
  span = 180,
): string {
  if (text.length <= span) return text;
  const firstWord = term.split(/\s+/).filter(Boolean)[0] || "";
  const at = firstWord
    ? text.toLowerCase().indexOf(firstWord.toLowerCase())
    : -1;
  if (at <= span / 2) return `${text.slice(0, span)}…`;
  const start = Math.max(0, at - Math.floor(span / 2));
  const end = Math.min(text.length, start + span);
  return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
}
