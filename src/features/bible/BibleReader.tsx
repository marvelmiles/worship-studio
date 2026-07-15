import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, BookmarkPlus, ChevronLeft, ChevronRight, Play, RotateCcw, X } from "lucide-react";
import type { BibleVersionId, PassageRange } from "../../types";
import { BIBLE_BOOKS, bookById } from "../../data/bibleBooks";
import { C, DISPLAY, UI, glass } from "../../theme/tokens";
import { useStore } from "../../store/useStore";
import type { ScriptureSelection } from "../../store/useStore";
import { Btn, IconBtn } from "../../components/ui/Button";
import { TextInput } from "../../components/ui/Field";
import { useBibleChapter } from "./useBibleChapter";
import { parseReference, formatRange } from "./lib/reference";
import { SavePassageModal } from "./SavePassageModal";

interface BibleReaderProps {
  version: BibleVersionId;
  bookId: number;
  chapter: number;
  onNavigate: (bookId: number, chapter: number) => void;
}

interface VerseSelection {
  start: number;
  end: number;
}

export function BibleReader({ version, bookId, chapter, onNavigate }: BibleReaderProps) {
  const pushToast = useStore((s) => s.pushToast);
  const presentScriptureSelection = useStore((s) => s.presentScriptureSelection);
  const saveScripturePassage = useStore((s) => s.saveScripturePassage);

  const { verses, loading, error, retry } = useBibleChapter(version, bookId, chapter);
  const [selection, setSelection] = useState<VerseSelection | null>(null);
  const [refInput, setRefInput] = useState("");
  const [pendingSave, setPendingSave] = useState<ScriptureSelection | null>(null);
  const verseRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const pendingScrollVerse = useRef<number | null>(null);

  const book = bookById(bookId);

  useEffect(() => {
    setSelection(null);
  }, [version, bookId, chapter]);

  useEffect(() => {
    const target = pendingScrollVerse.current;
    if (target === null || loading || !verses.length) return;
    pendingScrollVerse.current = null;
    verseRefs.current[target]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [loading, verses]);

  const selectedVerses = useMemo(() => {
    if (!selection) return [];
    return verses.filter((v) => v.v >= selection.start && v.v <= selection.end);
  }, [verses, selection]);

  const buildSelection = (): ScriptureSelection | null => {
    if (!selection || !book || !selectedVerses.length) return null;
    const range: PassageRange = {
      bookId,
      bookName: book.name,
      chapter,
      verseStart: selection.start,
      verseEnd: selection.end,
    };
    return { version, range, verses: selectedVerses };
  };

  const handleVerseClick = (verse: number, shiftKey: boolean) => {
    setSelection((prev) => {
      if (prev && shiftKey) {
        return { start: Math.min(prev.start, verse), end: Math.max(prev.end, verse) };
      }
      if (prev && prev.start === verse && prev.end === verse) return null;
      return { start: verse, end: verse };
    });
  };

  const jumpToReference = () => {
    const parsed = parseReference(refInput);
    if (!parsed) {
      pushToast("Couldn't read that reference — try something like John 3:16-18.", "error");
      return;
    }
    onNavigate(parsed.book.id, parsed.chapter);
    if (parsed.verseStart !== undefined) {
      setSelection({ start: parsed.verseStart, end: parsed.verseEnd ?? parsed.verseStart });
      pendingScrollVerse.current = parsed.verseStart;
    }
    setRefInput("");
  };

  const goChapter = (delta: number) => {
    let nextBook = bookId;
    let nextChapter = chapter + delta;
    if (book && nextChapter > book.chapters) {
      if (bookId >= 66) return;
      nextBook = bookId + 1;
      nextChapter = 1;
    } else if (nextChapter < 1) {
      if (bookId <= 1) return;
      nextBook = bookId - 1;
      nextChapter = bookById(nextBook)?.chapters || 1;
    }
    onNavigate(nextBook, nextChapter);
  };

  const presentSelection = (single?: number) => {
    const sel =
      single !== undefined && book
        ? {
            version,
            range: { bookId, bookName: book.name, chapter, verseStart: single, verseEnd: single },
            verses: verses.filter((v) => v.v === single),
          }
        : buildSelection();
    if (!sel || !sel.verses.length) return;
    presentScriptureSelection(sel);
  };

  const saveSelection = (versesPerSlide: number, showVerseNumbers: boolean, showReference: boolean) => {
    if (!pendingSave) return;
    const passage = saveScripturePassage({ ...pendingSave, versesPerSlide, showVerseNumbers, showReference });
    setPendingSave(null);
    if (passage) pushToast(`Saved ${passage.title} to your passages.`);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0, height: "100%" }}>
      <div className="ws-row-wrap" style={{ marginBottom: 14 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 190 }}>
          <TextInput
            value={refInput}
            placeholder="Go to reference — e.g. John 3:16-18"
            onChange={(e) => setRefInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") jumpToReference();
            }}
          />
        </div>
        <Btn variant="ghost" onClick={jumpToReference} title="Go to reference">
          <ArrowRight size={15} />
          Go
        </Btn>
        <span style={{ flex: 1 }} />
        <div className="ws-row" style={{ gap: 6 }}>
          <IconBtn icon={ChevronLeft} title="Previous chapter" onClick={() => goChapter(-1)} />
          <span
            style={{
              fontFamily: DISPLAY,
              fontSize: 17,
              fontWeight: 600,
              color: C.text,
              minWidth: 130,
              textAlign: "center",
            }}
          >
            {book?.name} {chapter}
          </span>
          <IconBtn icon={ChevronRight} title="Next chapter" onClick={() => goChapter(1)} />
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingRight: 6, paddingBottom: selection ? 76 : 12 }}>
        {loading && (
          <div style={{ padding: 40, textAlign: "center", fontFamily: UI, color: C.dim }}>
            Loading {book?.name} {chapter} ({version})…
          </div>
        )}
        {!loading && error && (
          <div style={{ ...glass, padding: 28, textAlign: "center" }}>
            <p style={{ fontFamily: UI, color: C.sub, marginTop: 0, lineHeight: 1.6 }}>{error}</p>
            <Btn variant="primary" onClick={retry}>
              <RotateCcw size={14} />
              Try again
            </Btn>
          </div>
        )}
        {!loading &&
          !error &&
          verses.map((verse) => {
            const selected = selection && verse.v >= selection.start && verse.v <= selection.end;
            return (
              <div
                key={verse.v}
                ref={(el) => (verseRefs.current[verse.v] = el)}
                onClick={(e) => handleVerseClick(verse.v, e.shiftKey)}
                onDoubleClick={() => presentSelection(verse.v)}
                title="Click to select · Shift-click to extend · Double-click to present this verse"
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "9px 12px",
                  borderRadius: 10,
                  cursor: "pointer",
                  marginBottom: 2,
                  background: selected ? "rgba(216,162,74,0.13)" : "transparent",
                  border: `1px solid ${selected ? "rgba(216,162,74,0.35)" : "transparent"}`,
                  userSelect: "none",
                }}
              >
                <span
                  style={{
                    fontFamily: UI,
                    fontSize: 12,
                    fontWeight: 700,
                    color: selected ? C.gold : C.dim,
                    minWidth: 22,
                    textAlign: "right",
                    paddingTop: 3,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {verse.v}
                </span>
                <span
                  style={{
                    fontFamily: UI,
                    fontSize: 15,
                    lineHeight: 1.65,
                    whiteSpace: "pre-line",
                    color: selected ? C.text : C.sub,
                  }}
                >
                  {verse.t}
                </span>
              </div>
            );
          })}
      </div>

      {selection && selectedVerses.length > 0 && book && (
        <div
          style={{
            position: "sticky",
            bottom: 10,
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            padding: "10px 14px",
            borderRadius: 14,
            background: "rgba(20,18,26,0.96)",
            border: `1px solid ${C.borderStrong}`,
            boxShadow: "0 14px 40px rgba(0,0,0,0.5)",
          }}
        >
          <span style={{ fontFamily: UI, fontSize: 13.5, fontWeight: 600, color: C.goldSoft }}>
            {formatRange({ bookId, bookName: book.name, chapter, verseStart: selection.start, verseEnd: selection.end })}
          </span>
          <span style={{ fontFamily: UI, fontSize: 12, color: C.dim }}>
            {selectedVerses.length} verse{selectedVerses.length === 1 ? "" : "s"}
          </span>
          <span style={{ flex: 1 }} />
          <Btn size="sm" variant="primary" onClick={() => presentSelection()}>
            <Play size={13} />
            Present
          </Btn>
          <Btn size="sm" variant="ghost" onClick={() => setPendingSave(buildSelection())}>
            <BookmarkPlus size={13} />
            Save passage
          </Btn>
          <IconBtn icon={X} title="Clear selection" onClick={() => setSelection(null)} />
        </div>
      )}

      <SavePassageModal
        selection={pendingSave}
        onClose={() => setPendingSave(null)}
        onSave={saveSelection}
      />
    </div>
  );
}

export const FIRST_BOOK_ID = BIBLE_BOOKS[0].id;
