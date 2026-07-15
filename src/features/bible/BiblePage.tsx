import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ArrowLeft, BookOpen, Bookmark, ChevronRight, Play, RotateCcw, Trash2 } from "lucide-react";
import type { BibleVersionId } from "../../types";
import { BIBLE_BOOKS, BIBLE_VERSIONS, bookById } from "../../data/bibleBooks";
import type { BibleBook } from "../../data/bibleBooks";
import { C, DISPLAY, UI } from "../../theme/tokens";
import { useStore } from "../../store/useStore";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { PageHeader } from "../../components/ui/PageHeader";
import { PillTabs } from "../../components/ui/PillTabs";
import { Btn, IconBtn } from "../../components/ui/Button";
import { Select } from "../../components/ui/Field";
import { SearchInput } from "../../components/ui/SearchInput";
import { useBibleChapter } from "./useBibleChapter";
import { useBibleSearch } from "./useBibleSearch";
import { BibleReader } from "./BibleReader";
import { SavedPassages } from "./SavedPassages";

type BibleTab = "read" | "saved";

/** Drill-down steps of the read tab: books → chapters → verses → reading. */
type ReadStep = "books" | "chapters" | "verses" | "read";

const POSITION_KEY = "ws:bible-position";

const versionOptions = BIBLE_VERSIONS.map((v) => ({ value: v.id, label: `${v.id} — ${v.name}` }));

interface ReadingPosition {
  bookId: number;
  chapter: number;
}

function loadPosition(): ReadingPosition {
  try {
    const raw = localStorage.getItem(POSITION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ReadingPosition;
      if (parsed.bookId >= 1 && parsed.bookId <= 66 && parsed.chapter >= 1) return parsed;
    }
  } catch {
    /* fall back to default */
  }
  return { bookId: 43, chapter: 3 };
}

const tileStyle = (active = false): CSSProperties => ({
  padding: "10px 0",
  borderRadius: 10,
  cursor: "pointer",
  fontFamily: UI,
  fontSize: 13.5,
  fontWeight: 600,
  fontVariantNumeric: "tabular-nums",
  textAlign: "center",
  border: `1px solid ${active ? "rgba(216,162,74,0.4)" : C.border}`,
  background: active ? "rgba(216,162,74,0.16)" : C.raise,
  color: active ? C.goldSoft : C.text,
});

export function BiblePage() {
  useDocumentTitle("Bible · WorshipStudio");

  const prefs = useStore((s) => s.prefs);
  const setBibleVersion = useStore((s) => s.setBibleVersion);
  const scriptures = useStore((s) => s.scriptures);

  const [tab, setTab] = useState<BibleTab>("read");
  const [trashView, setTrashView] = useState(false);
  const [step, setStep] = useState<ReadStep>("books");
  const [position, setPosition] = useState<ReadingPosition>(loadPosition);
  const [focusVerse, setFocusVerse] = useState<number | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(POSITION_KEY, JSON.stringify(position));
    } catch {
      /* non-fatal */
    }
  }, [position]);

  const book = bookById(position.bookId);
  const savedCount = scriptures.filter((s) => !s.quick && !s.deleted).length;

  const openBook = (bookId: number) => {
    setPosition((prev) => ({ bookId, chapter: bookId === prev.bookId ? prev.chapter : 1 }));
    setFocusVerse(null);
    setStep("chapters");
  };
  const openChapter = (chapter: number) => {
    setPosition((prev) => ({ ...prev, chapter }));
    setFocusVerse(null);
    setStep("verses");
  };
  const openVerse = (verse: number) => {
    setFocusVerse(verse);
    setStep("read");
  };
  const openChapterReader = () => {
    setFocusVerse(null);
    setStep("read");
  };

  /** In-reader navigation (prev/next chapter, reference jump) stays on the read step. */
  const navigateReader = (bookId: number, chapter: number) => {
    setPosition({ bookId, chapter });
    setFocusVerse(null);
    setStep("read");
  };

  const goBack = () => {
    if (step === "read") setStep("verses");
    else if (step === "verses") setStep("chapters");
    else if (step === "chapters") setStep("books");
    if (step !== "books") setFocusVerse(null);
  };

  const crumbBtn: CSSProperties = {
    border: "none",
    background: "transparent",
    padding: "4px 2px",
    cursor: "pointer",
    fontFamily: UI,
    fontSize: 13.5,
    fontWeight: 600,
    color: C.sub,
  };
  const crumbCurrent: CSSProperties = { ...crumbBtn, cursor: "default", color: C.goldSoft };
  const crumbSep = <ChevronRight size={13} color={C.dim} style={{ flexShrink: 0 }} />;

  const readView = (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div
        className="ws-row-wrap"
        style={{
          alignItems: "center",
          gap: 8,
          marginBottom: 14,
          paddingBottom: 12,
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        {step !== "books" && <IconBtn icon={ArrowLeft} title="Back" onClick={goBack} />}
        <div className="ws-row" style={{ gap: 6, alignItems: "center", flexWrap: "wrap", minWidth: 0 }}>
          <button style={step === "books" ? crumbCurrent : crumbBtn} onClick={() => setStep("books")}>
            Books
          </button>
          {step !== "books" && book && (
            <>
              {crumbSep}
              <button
                style={step === "chapters" ? crumbCurrent : crumbBtn}
                onClick={() => setStep("chapters")}
              >
                {book.name}
              </button>
            </>
          )}
          {(step === "verses" || step === "read") && (
            <>
              {crumbSep}
              <button
                style={step === "verses" ? crumbCurrent : crumbBtn}
                onClick={() => {
                  setFocusVerse(null);
                  setStep("verses");
                }}
              >
                Chapter {position.chapter}
              </button>
            </>
          )}
          {step === "read" && (
            <>
              {crumbSep}
              <span style={crumbCurrent}>{focusVerse ? `Verse ${focusVerse}` : "Reading"}</span>
            </>
          )}
        </div>
        <span style={{ flex: 1 }} />
        <div style={{ width: 230, maxWidth: "100%" }}>
          <Select
            value={prefs.bibleVersion}
            options={versionOptions}
            onChange={(e) => setBibleVersion(e.target.value as BibleVersionId)}
          />
        </div>
      </div>

      {step === "books" && (
        <BooksStep
          position={position}
          version={prefs.bibleVersion}
          continueLabel={book ? `${book.name} ${position.chapter}` : null}
          onBook={openBook}
          onContinue={openChapterReader}
          onResult={(bookId, chapter, verse) => {
            setPosition({ bookId, chapter });
            setFocusVerse(verse);
            setStep("read");
          }}
        />
      )}
      {step === "chapters" && book && <ChaptersStep book={book} chapter={position.chapter} onChapter={openChapter} />}
      {step === "verses" && book && (
        <VersesStep
          version={prefs.bibleVersion}
          book={book}
          chapter={position.chapter}
          onVerse={openVerse}
          onReadChapter={openChapterReader}
        />
      )}
      {step === "read" && (
        <div style={{ flex: 1, minHeight: 0 }}>
          <BibleReader
            version={prefs.bibleVersion}
            bookId={position.bookId}
            chapter={position.chapter}
            focusVerse={focusVerse}
            onNavigate={navigateReader}
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="ws-page" style={{ display: "flex", flexDirection: "column", height: "100%", maxHeight: "100%" }}>
      <PageHeader
        title="Bible"
        subtitle="Read, project and save scripture — KJV, NKJV, NIV, ESV and NLT."
        actions={
          <>
            <PillTabs<BibleTab>
              tabs={[
                { id: "read", label: "Read", icon: BookOpen },
                { id: "saved", label: `Saved (${savedCount})`, icon: Bookmark },
              ]}
              value={tab}
              onChange={(next) => {
                setTab(next);
                if (next === "read") setTrashView(false);
              }}
            />
            {tab === "saved" && (
              <Btn variant={trashView ? "primary" : "ghost"} onClick={() => setTrashView((v) => !v)}>
                <Trash2 size={15} />
                {trashView ? "Passages" : "Trash"}
              </Btn>
            )}
          </>
        }
      />

      {tab === "read" ? (
        readView
      ) : (
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          <SavedPassages trashView={trashView} />
        </div>
      )}
    </div>
  );
}

/** Escapes regex metacharacters so search words can be matched literally. */
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Wraps occurrences of the search words in a gold highlight. */
function highlightMatches(text: string, term: string) {
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
function snippetAround(text: string, term: string, span = 180): string {
  if (text.length <= span) return text;
  const firstWord = term.split(/\s+/).filter(Boolean)[0] || "";
  const at = firstWord ? text.toLowerCase().indexOf(firstWord.toLowerCase()) : -1;
  if (at <= span / 2) return `${text.slice(0, span)}…`;
  const start = Math.max(0, at - Math.floor(span / 2));
  const end = Math.min(text.length, start + span);
  return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
}

function BooksStep({
  position,
  version,
  continueLabel,
  onBook,
  onContinue,
  onResult,
}: {
  position: ReadingPosition;
  version: BibleVersionId;
  continueLabel: string | null;
  onBook: (bookId: number) => void;
  onContinue: () => void;
  onResult: (bookId: number, chapter: number, verse: number) => void;
}) {
  const [query, setQuery] = useState("");
  const search = useBibleSearch(version, query);

  const filtered = useMemo(() => {
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
          <Btn variant="ghost" onClick={onContinue} title="Pick up where you left off">
            <Play size={14} />
            Continue — {continueLabel}
          </Btn>
        )}
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingRight: 6, paddingBottom: 12 }}>
        {filtered.length === 0 && !search.enabled && (
          <p style={{ fontFamily: UI, color: C.dim, textAlign: "center", padding: 30 }}>
            No book matches "{query}".
          </p>
        )}
        {testaments.map(({ label, key }) => {
          const books = filtered.filter((b) => b.testament === key);
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
                      onClick={() => onBook(b.id)}
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
                    onClick={() => onResult(result.bookId, result.chapter, result.verse)}
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
                      {highlightMatches(snippetAround(result.text, search.term), search.term)}
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

function ChaptersStep({
  book,
  chapter,
  onChapter,
}: {
  book: BibleBook;
  chapter: number;
  onChapter: (chapter: number) => void;
}) {
  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingRight: 6, paddingBottom: 12 }}>
      <h2 style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 600, color: C.text, margin: "2px 0 4px" }}>
        {book.name}
      </h2>
      <p style={{ fontFamily: UI, fontSize: 13, color: C.sub, margin: "0 0 16px" }}>
        Pick a chapter to continue.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(56px,1fr))", gap: 8 }}>
        {Array.from({ length: book.chapters }, (_, i) => i + 1).map((n) => (
          <button key={n} onClick={() => onChapter(n)} style={tileStyle(n === chapter)}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function VersesStep({
  version,
  book,
  chapter,
  onVerse,
  onReadChapter,
}: {
  version: BibleVersionId;
  book: BibleBook;
  chapter: number;
  onVerse: (verse: number) => void;
  onReadChapter: () => void;
}) {
  const { verses, loading, error, retry } = useBibleChapter(version, book.id, chapter);

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingRight: 6, paddingBottom: 12 }}>
      <div className="ws-row-wrap" style={{ alignItems: "center", marginBottom: 4 }}>
        <h2 style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 600, color: C.text, margin: "2px 0" }}>
          {book.name} {chapter}
        </h2>
        <span style={{ flex: 1 }} />
        <Btn variant="primary" onClick={onReadChapter}>
          <BookOpen size={15} />
          Read full chapter
        </Btn>
      </div>
      <p style={{ fontFamily: UI, fontSize: 13, color: C.sub, margin: "0 0 16px" }}>
        Jump straight to a verse, or read the whole chapter.
      </p>
      {loading && (
        <div style={{ padding: 36, textAlign: "center", fontFamily: UI, color: C.dim }}>
          Loading {book.name} {chapter} ({version})…
        </div>
      )}
      {!loading && error && (
        <div style={{ padding: 26, textAlign: "center" }}>
          <p style={{ fontFamily: UI, color: C.sub, marginTop: 0, lineHeight: 1.6 }}>{error}</p>
          <Btn variant="primary" onClick={retry}>
            <RotateCcw size={14} />
            Try again
          </Btn>
        </div>
      )}
      {!loading && !error && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(56px,1fr))", gap: 8 }}>
          {verses.map((verse) => (
            <button
              key={verse.v}
              onClick={() => onVerse(verse.v)}
              title={verse.t.length > 140 ? `${verse.t.slice(0, 140)}…` : verse.t}
              style={tileStyle(false)}
            >
              {verse.v}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
