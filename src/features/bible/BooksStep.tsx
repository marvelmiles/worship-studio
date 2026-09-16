import { useMemo, useState, type ReactNode } from "react";
import { ArrowRight, Play } from "lucide-react";
import type { BibleVersionId } from "../../types";
import { BIBLE_BOOKS, bookById } from "../../data/bibleBooks";

import { useUITheme } from "../../theme/ThemeProvider";
import type { ScriptureSelection } from "../../store/useStore";
import { Button } from "../../components/ui/Button";
import { SearchInput } from "../../components/ui/SearchInput";
import { Spinner } from "../../components/ui/Spinner";
import { useBibleSearch } from "./useBibleSearch";
import { useBibleChapter } from "./useBibleChapter";
import { PresentButton } from "./PresentButton";
import { VerseSnippet } from "./VerseSnippet";
import { tileStyle } from "./tileStyle";
import {
  formatParsedReference,
  parseReference,
  referenceSpan,
  type ParsedReference,
  type VerseSpan,
} from "./lib/reference";
import { buildScriptureSelection } from "./lib/scriptureSelection";
import type { ReadingPosition } from "./lib/readingPosition";

export const BooksStep = ({
  position,
  version,
  continueLabel,
  onOpenBook,
  onContinueReading,
  onOpenSearchResult,
}: {
  position: ReadingPosition;
  version: BibleVersionId;
  continueLabel: string | null;
  onOpenBook: (bookId: number) => void;
  onContinueReading: () => void;
  onOpenSearchResult: (
    bookId: number,
    chapter: number,
    span: VerseSpan,
  ) => void;
}) => {
  const { colors, fonts } = useUITheme();
  const [query, setQuery] = useState("");

  const reference = useMemo(() => {
    const parsed = parseReference(query);
    return parsed?.hasChapter ? parsed : null;
  }, [query]);

  const search = useBibleSearch(version, reference ? "" : query);

  const matchingBooks = useMemo(() => {
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
              fontFamily: fonts.ui,
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
                          fontFamily: fonts.display,
                          fontSize: 15,
                          maxWidth: "100%",
                        }}
                      >
                        {b.name}
                      </span>
                      <span
                        style={{
                          fontFamily: fonts.ui,
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
                  fontFamily: fonts.ui,
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
                    fontFamily: fonts.ui,
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
                        fontFamily: fonts.ui,
                        fontSize: 13.5,
                        lineHeight: 1.55,
                        color: colors.sub,
                      }}
                    >
                      <VerseSnippet text={result.text} term={search.term} />
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
};

const ResultRow = ({
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
  presentDisabled?: boolean;
  emphasis?: boolean;
  children: ReactNode;
}) => {
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
};

const PassageJump = ({
  reference,
  version,
  onOpen,
}: {
  reference: ParsedReference;
  version: BibleVersionId;
  onOpen: () => void;
}) => {
  const { colors, fonts } = useUITheme();
  const { verses, loading, error } = useBibleChapter(
    version,
    reference.book.id,
    reference.chapter,
  );

  const { book, chapter, verseStart, verseEnd } = reference;
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
        title={`Open ${formatParsedReference(reference)}`}
        heading={formatParsedReference(reference)}
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
        presentTitle={`Present ${formatParsedReference(reference)}`}
        presentDisabled={loading || Boolean(error) || !preview.length}
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
};
