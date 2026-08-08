import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Bookmark,
  ChevronRight,
  Trash2,
} from "lucide-react";
import type { BibleVersionId } from "../../types";
import { BIBLE_VERSIONS, bookById } from "../../data/bibleBooks";
import { colors, UI } from "../../theme/tokens";
import { useStore } from "../../store/useStore";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { PageHeader } from "../../components/ui/PageHeader";
import { PillTabs } from "../../components/ui/PillTabs";
import { Button, IconButton } from "../../components/ui/Button";
import { Select } from "../../components/ui/Field";
import { BibleReader } from "./BibleReader";
import { SavedPassages } from "./SavedPassages";
import { BooksStep } from "./BooksStep";
import { ChaptersStep } from "./ChaptersStep";
import { VersesStep } from "./VersesStep";
import {
  loadReadingPosition,
  saveReadingPosition,
} from "./lib/readingPosition";
import type { ReadingPosition } from "./lib/readingPosition";
import { recordReading } from "./lib/readingHistory";
import type { VerseSpan } from "./lib/reference";

type BibleTab = "read" | "saved";

/** Drill-down steps of the read tab: books → chapters → verses → reading. */
type ReadStep = "books" | "chapters" | "verses" | "read";

const versionOptions = BIBLE_VERSIONS.map((v) => ({
  value: v.id,
  label: `${v.id} · ${v.name}`,
}));

/**
 * The Bible page. The "Read" tab is a four-step drill-down (pick a book →
 * chapter → verse → read); the "Saved" tab lists stored passages. This
 * component only coordinates which step is visible and where the reader is,
 * each step renders in its own component, and all verse text comes from the
 * offline data layer via the useBibleChapter / useBibleSearch hooks.
 */
export function BiblePage() {
  useDocumentTitle("Bible · WorshipStudio");

  const prefs = useStore((s) => s.prefs);
  const setBibleVersion = useStore((s) => s.setBibleVersion);
  const scriptures = useStore((s) => s.scriptures);

  const [tab, setTab] = useState<BibleTab>("read");
  const [trashView, setTrashView] = useState(false);
  const [step, setStep] = useState<ReadStep>("books");
  const [readingPosition, setReadingPosition] =
    useState<ReadingPosition>(loadReadingPosition);
  /**
   * Verses the reader should scroll to and pre-select, when set. Held in state
   * so its identity stays stable across renders (the reader re-applies the
   * selection whenever this changes).
   */
  const [focusRange, setFocusRange] = useState<VerseSpan | null>(null);
  /** Single-verse convenience over the range above. */
  const setFocusVerse = (verse: number | null) =>
    setFocusRange(verse == null ? null : { start: verse, end: verse });

  useEffect(() => {
    saveReadingPosition(readingPosition);
  }, [readingPosition]);

  // Every position actually seen in the reader lands in the reading history,
  // which the dashboard lists as individual activities.
  useEffect(() => {
    if (step !== "read") return;
    recordReading(readingPosition);
  }, [step, readingPosition]);

  // Deep-links (e.g. dashboard activities) jump straight into the reader at a
  // given position, focusing its verse, or verse 1 for a whole-chapter read.
  const location = useLocation();
  const navigate = useNavigate();
  const readTarget = (
    location.state as {
      read?: { bookId: number; chapter: number; verse: number | null };
    } | null
  )?.read;
  useEffect(() => {
    if (!readTarget) return;
    setReadingPosition({
      bookId: readTarget.bookId,
      chapter: readTarget.chapter,
      verse: readTarget.verse ?? null,
    });
    setFocusVerse(readTarget.verse ?? 1);
    setStep("read");
    // Dropped through the router rather than history directly, so the entry
    // keeps the bookkeeping Back and Forward rely on.
    navigate(location.pathname, { replace: true, state: null });
  }, [readTarget, navigate, location.pathname]);

  const book = bookById(readingPosition.bookId);
  const savedCount = scriptures.filter((s) => !s.quick && !s.deleted).length;

  const openBook = (bookId: number) => {
    // Re-opening the book you were in keeps its remembered chapter and verse.
    setReadingPosition((prev) =>
      bookId === prev.bookId ? prev : { bookId, chapter: 1, verse: null },
    );
    setFocusVerse(null);
    setStep("chapters");
  };
  const openChapter = (chapter: number) => {
    setReadingPosition((prev) => ({ ...prev, chapter, verse: null }));
    setFocusVerse(null);
    setStep("verses");
  };
  const openVerse = (verse: number) => {
    setReadingPosition((prev) => ({ ...prev, verse }));
    setFocusVerse(verse);
    setStep("read");
  };
  const openChapterReader = () => {
    setFocusVerse(null);
    setStep("read");
  };
  /**
   * Opens a search hit in the reader. A reference covering several verses
   * ("Jn 2:3-10") or a whole chapter ("Jn 2") arrives with its full span, so
   * the reader lands with all of it selected and ready to present or save.
   */
  const openSearchResult = (
    bookId: number,
    chapter: number,
    span: VerseSpan,
  ) => {
    setReadingPosition({ bookId, chapter, verse: span.start });
    setFocusRange(span);
    setStep("read");
  };

  /** Continue button: jump straight back to the remembered verse (or chapter). */
  const continueReading = () => {
    setFocusVerse(readingPosition.verse ?? null);
    setStep("read");
  };

  /** In-reader navigation (prev/next chapter, reference jump) stays on the read step. */
  const navigateReader = (bookId: number, chapter: number) => {
    setReadingPosition({ bookId, chapter, verse: null });
    setFocusVerse(null);
    setStep("read");
  };

  /**
   * The reader reports the verse the user is on (selection or read-aloud
   * progress) so "Continue" can return to the exact verse.
   */
  const rememberCurrentVerse = useCallback((verse: number | null) => {
    setReadingPosition((prev) =>
      prev.verse === verse ? prev : { ...prev, verse },
    );
  }, []);

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
    color: colors.sub,
  };
  const crumbCurrent: CSSProperties = {
    ...crumbBtn,
    cursor: "default",
    color: colors.accentSoft,
  };
  const crumbSep = (
    <ChevronRight size={13} color={colors.dim} style={{ flexShrink: 0 }} />
  );

  const readView = (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        className="ws-row-wrap"
        style={{
          alignItems: "center",
          gap: 8,
          marginBottom: 14,
          paddingBottom: 12,
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        {step !== "books" && (
          <IconButton icon={ArrowLeft} title="Back" onClick={goBack} />
        )}
        <div
          className="ws-row"
          style={{
            gap: 6,
            alignItems: "center",
            flexWrap: "wrap",
            minWidth: 0,
          }}
        >
          <button
            style={step === "books" ? crumbCurrent : crumbBtn}
            onClick={() => setStep("books")}
          >
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
                Chapter {readingPosition.chapter}
              </button>
            </>
          )}
          {step === "read" && (
            <>
              {crumbSep}
              <span style={crumbCurrent}>
                {!focusRange
                  ? "Reading"
                  : focusRange.start === focusRange.end
                    ? `Verse ${focusRange.start}`
                    : `Verses ${focusRange.start}-${focusRange.end}`}
              </span>
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
          position={readingPosition}
          version={prefs.bibleVersion}
          continueLabel={
            book
              ? `${book.name} ${readingPosition.chapter}${readingPosition.verse ? `:${readingPosition.verse}` : ""}`
              : null
          }
          onOpenBook={openBook}
          onContinueReading={continueReading}
          onOpenSearchResult={openSearchResult}
        />
      )}
      {step === "chapters" && book && (
        <ChaptersStep
          book={book}
          chapter={readingPosition.chapter}
          onOpenChapter={openChapter}
        />
      )}
      {step === "verses" && book && (
        <VersesStep
          version={prefs.bibleVersion}
          book={book}
          chapter={readingPosition.chapter}
          onOpenVerse={openVerse}
          onReadWholeChapter={openChapterReader}
        />
      )}
      {step === "read" && (
        <div style={{ flex: 1, minHeight: 0 }}>
          <BibleReader
            version={prefs.bibleVersion}
            bookId={readingPosition.bookId}
            chapter={readingPosition.chapter}
            focusRange={focusRange}
            onNavigate={navigateReader}
            onCurrentVerseChange={rememberCurrentVerse}
          />
        </div>
      )}
    </div>
  );

  return (
    <div
      className="ws-page"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        maxHeight: "100%",
      }}
    >
      <PageHeader
        title="Bible"
        subtitle="Read, project and save scripture, KJV and ASV, built in and fully offline."
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
              <Button
                variant={trashView ? "primary" : "ghost"}
                onClick={() => setTrashView((v) => !v)}
              >
                <Trash2 size={15} />
                {trashView ? "Passages" : "Trash"}
              </Button>
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
