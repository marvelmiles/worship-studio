import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookmarkPlus,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  Pencil,
  Play,
  RotateCcw,
  Square,
  Volume2,
  X,
} from "lucide-react";
import type { BibleVerse, BibleVersionId, PassageRange } from "../../types";
import { BIBLE_BOOKS, bookById } from "../../data/bibleBooks";
import { C, DISPLAY, UI, glass } from "../../theme/tokens";
import { useStore } from "../../store/useStore";
import type { SavePassageOptions, ScriptureSelection } from "../../store/useStore";
import type { ScripturePassage } from "../../types";
import { useSpeech } from "../../hooks/useSpeech";
import { Btn, IconBtn } from "../../components/ui/Button";
import { TextInput } from "../../components/ui/Field";
import { useBibleChapter } from "./useBibleChapter";
import { parseReference, formatRange, formatReference } from "./lib/reference";
import { findSavedDuplicates, hasSameContent, nextCopyTitle } from "./lib/passageDuplicates";
import { SavePassageModal } from "./SavePassageModal";
import { DuplicatePassageModal } from "./DuplicatePassageModal";

interface BibleReaderProps {
  version: BibleVersionId;
  bookId: number;
  chapter: number;
  /** Verse to pre-select and auto-scroll to when the reader opens. */
  focusVerse?: number | null;
  onNavigate: (bookId: number, chapter: number) => void;
  /**
   * Reports the verse the user is currently on — the first verse of their
   * selection (null when they clear it), or the verse being spoken while
   * reading aloud — so the page can remember where they stopped.
   */
  onCurrentVerseChange?: (verse: number | null) => void;
}

/** Contiguous verse range; `anchor` is where it started, `focus` is the active end. */
interface VerseSelection {
  anchor: number;
  focus: number;
}

export function BibleReader({
  version,
  bookId,
  chapter,
  focusVerse,
  onNavigate,
  onCurrentVerseChange,
}: BibleReaderProps) {
  const navigate = useNavigate();
  const pushToast = useStore((s) => s.pushToast);
  const presentScriptureSelection = useStore(
    (s) => s.presentScriptureSelection,
  );
  const stageScriptureSelection = useStore((s) => s.stageScriptureSelection);
  const saveScripturePassage = useStore((s) => s.saveScripturePassage);
  const overwriteScripturePassage = useStore((s) => s.overwriteScripturePassage);
  const scriptures = useStore((s) => s.scriptures);

  const { verses, loading, error, retry } = useBibleChapter(
    version,
    bookId,
    chapter,
  );
  const [selection, setSelection] = useState<VerseSelection | null>(null);
  const [refInput, setRefInput] = useState("");
  const [pendingSave, setPendingSave] = useState<ScriptureSelection | null>(
    null,
  );
  /** Set when a save collides with an existing passage whose content differs. */
  const [duplicatePrompt, setDuplicatePrompt] = useState<{
    options: SavePassageOptions;
    existing: ScripturePassage;
  } | null>(null);
  const [readingVerse, setReadingVerse] = useState<number | null>(null);
  const speech = useSpeech();
  const verseRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const pendingScrollVerse = useRef<number | null>(null);
  /** Selection a reference jump wants applied once its chapter opens. */
  const pendingJumpSelection = useRef<VerseSelection | null>(null);

  const book = bookById(bookId);
  const selStart = selection
    ? Math.min(selection.anchor, selection.focus)
    : null;
  const selEnd = selection ? Math.max(selection.anchor, selection.focus) : null;

  // Changing chapter normally clears the selection — unless a reference jump
  // brought one along for the newly opened chapter.
  useEffect(() => {
    setSelection(pendingJumpSelection.current);
    pendingJumpSelection.current = null;
    speech.stop();
  }, [version, bookId, chapter, speech.stop]);

  // Runs after the reset above (definition order), so a focus verse handed in
  // by the page survives the chapter-change reset and lands pre-selected.
  useEffect(() => {
    if (focusVerse == null) return;
    setSelection({ anchor: focusVerse, focus: focusVerse });
    pendingScrollVerse.current = focusVerse;
  }, [focusVerse, version, bookId, chapter]);

  useEffect(() => {
    if (!speech.speaking) setReadingVerse(null);
  }, [speech.speaking]);

  // Tell the page which verse the user is on (or that they cleared the
  // selection) so "Continue" can come back to the exact spot later.
  useEffect(() => {
    onCurrentVerseChange?.(selStart);
  }, [selStart, onCurrentVerseChange]);

  // While reading aloud, the spoken verse is the user's place. Null (speech
  // ended or was stopped) is deliberately not reported — the last spoken
  // verse stays remembered as where the reading stopped.
  useEffect(() => {
    if (readingVerse !== null) onCurrentVerseChange?.(readingVerse);
  }, [readingVerse, onCurrentVerseChange]);

  useEffect(() => {
    const target = pendingScrollVerse.current;
    if (target === null || loading || !verses.length) return;
    pendingScrollVerse.current = null;
    verseRefs.current[target]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [loading, verses]);

  const selectedVerses = useMemo(() => {
    if (selStart === null || selEnd === null) return [];
    return verses.filter((v) => v.v >= selStart && v.v <= selEnd);
  }, [verses, selStart, selEnd]);

  const allSelected =
    verses.length > 0 &&
    selStart !== null &&
    selStart <= verses[0].v &&
    (selEnd as number) >= verses[verses.length - 1].v;

  const toggleSelectAll = () => {
    if (!verses.length) return;
    setSelection(
      allSelected
        ? null
        : { anchor: verses[0].v, focus: verses[verses.length - 1].v },
    );
  };

  // Shift+ArrowUp/Down grows or shrinks the selection from its active end;
  // Ctrl+A selects the whole chapter (or clears it when already selected).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable)
      )
        return;
      if ((e.ctrlKey || e.metaKey) && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        toggleSelectAll();
        return;
      }
      if (!e.shiftKey || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
      if (!selection || !verses.length) return;
      const pos = verses.findIndex((v) => v.v === selection.focus);
      if (pos < 0) return;
      const nextPos = Math.max(
        0,
        Math.min(verses.length - 1, pos + (e.key === "ArrowDown" ? 1 : -1)),
      );
      const nextVerse = verses[nextPos].v;
      e.preventDefault();
      if (nextVerse === selection.focus) return;
      setSelection({ ...selection, focus: nextVerse });
      verseRefs.current[nextVerse]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selection, verses]);

  const buildSelection = (): ScriptureSelection | null => {
    if (selStart === null || selEnd === null || !book || !selectedVerses.length)
      return null;
    const range: PassageRange = {
      bookId,
      bookName: book.name,
      chapter,
      verseStart: selStart,
      verseEnd: selEnd,
    };
    return { version, range, verses: selectedVerses };
  };

  const handleVerseClick = (verse: number, extend: boolean) => {
    setSelection((prev) => {
      if (prev && extend) return { ...prev, focus: verse };
      if (prev && prev.anchor === verse && prev.focus === verse) return null;
      return { anchor: verse, focus: verse };
    });
  };

  const jumpToReference = () => {
    const parsed = parseReference(refInput);
    if (!parsed) {
      pushToast(
        "Couldn't read that reference — try something like John 3:16-18.",
        "error",
      );
      return;
    }
    // "John 3:16-18" selects that verse range; a chapter-only reference like
    // "John 3" lands selected on the chapter's first verse.
    const firstVerse = parsed.verseStart ?? 1;
    const lastVerse = parsed.verseEnd ?? firstVerse;
    const jumpSelection: VerseSelection = { anchor: firstVerse, focus: lastVerse };

    const stayingInChapter = parsed.book.id === bookId && parsed.chapter === chapter;
    if (stayingInChapter) {
      // Chapter is already rendered — select and scroll right away.
      setSelection(jumpSelection);
      verseRefs.current[firstVerse]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    } else {
      // Selection and scroll are applied once the new chapter has rendered.
      pendingJumpSelection.current = jumpSelection;
      pendingScrollVerse.current = firstVerse;
      onNavigate(parsed.book.id, parsed.chapter);
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
            range: {
              bookId,
              bookName: book.name,
              chapter,
              verseStart: single,
              verseEnd: single,
            },
            verses: verses.filter((v) => v.v === single),
          }
        : buildSelection();
    if (!sel || !sel.verses.length) return;
    presentScriptureSelection(sel);
  };

  const editSelection = () => {
    const sel = buildSelection();
    if (!sel) return;
    const passage = stageScriptureSelection(sel);
    if (passage) navigate(`/scripture/${passage.id}`);
  };

  const readAloud = (list: BibleVerse[]) => {
    if (!list.length) return;
    speech.speak(
      list.map((v) => v.t),
      (i) => {
        const verse = list[i]?.v;
        if (verse === undefined) return;
        setReadingVerse(verse);
        verseRefs.current[verse]?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      },
    );
  };

  const saveSelection = (
    versesPerSlide: number,
    showVerseNumbers: boolean,
    showReference: boolean,
  ) => {
    if (!pendingSave) return;
    const options: SavePassageOptions = {
      ...pendingSave,
      versesPerSlide,
      showVerseNumbers,
      showReference,
    };
    setPendingSave(null);

    const duplicates = findSavedDuplicates(scriptures, options);
    if (duplicates.length > 0) {
      // Exactly this passage is already saved — nothing to do.
      if (duplicates.some((passage) => hasSameContent(passage, options))) {
        pushToast(
          `${formatReference(options.range, options.version)} is already in your passages.`,
        );
        return;
      }
      // Same scripture, different content — let the user decide what to do.
      const mostRecent = duplicates.reduce((a, b) =>
        a.updatedAt > b.updatedAt ? a : b,
      );
      setDuplicatePrompt({ options, existing: mostRecent });
      return;
    }

    const passage = saveScripturePassage(options);
    if (passage) pushToast(`Saved ${passage.title} to your passages.`);
  };

  const overwriteDuplicate = () => {
    if (!duplicatePrompt) return;
    const updated = overwriteScripturePassage(
      duplicatePrompt.existing.id,
      duplicatePrompt.options,
    );
    setDuplicatePrompt(null);
    if (updated) pushToast(`Updated ${updated.title} with the new content.`);
  };

  const saveDuplicateCopy = () => {
    if (!duplicatePrompt) return;
    const { options } = duplicatePrompt;
    const title = nextCopyTitle(
      formatReference(options.range, options.version),
      scriptures,
    );
    const passage = saveScripturePassage({ ...options, title });
    setDuplicatePrompt(null);
    if (passage) pushToast(`Saved ${passage.title} to your passages.`);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        height: "100%",
      }}
    >
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
          <IconBtn
            icon={ListChecks}
            title={
              allSelected
                ? "Deselect all verses (Ctrl+A)"
                : "Select all verses (Ctrl+A)"
            }
            active={allSelected}
            onClick={toggleSelectAll}
          />
          {speech.supported && (
            <IconBtn
              icon={speech.speaking ? Square : Volume2}
              title={speech.speaking ? "Stop reading" : "Read chapter aloud"}
              active={speech.speaking}
              onClick={() =>
                speech.speaking ? speech.stop() : readAloud(verses)
              }
            />
          )}
          <IconBtn
            icon={ChevronLeft}
            title="Previous chapter"
            onClick={() => goChapter(-1)}
          />
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
          <IconBtn
            icon={ChevronRight}
            title="Next chapter"
            onClick={() => goChapter(1)}
          />
        </div>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          paddingRight: 6,
          paddingBottom: selection ? 76 : 12,
        }}
      >
        {loading && (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              fontFamily: UI,
              color: C.dim,
            }}
          >
            Loading {book?.name} {chapter} ({version})…
          </div>
        )}
        {!loading && error && (
          <div style={{ ...glass, padding: 28, textAlign: "center" }}>
            <p
              style={{
                fontFamily: UI,
                color: C.sub,
                marginTop: 0,
                lineHeight: 1.6,
              }}
            >
              {error}
            </p>
            <Btn variant="primary" onClick={retry}>
              <RotateCcw size={14} />
              Try again
            </Btn>
          </div>
        )}
        {!loading &&
          !error &&
          verses.map((verse) => {
            const selected =
              selStart !== null &&
              verse.v >= selStart &&
              verse.v <= (selEnd as number);
            const reading = readingVerse === verse.v;
            return (
              <div
                key={verse.v}
                ref={(el) => (verseRefs.current[verse.v] = el)}
                onClick={(e) =>
                  handleVerseClick(
                    verse.v,
                    e.ctrlKey || e.metaKey || e.shiftKey,
                  )
                }
                onDoubleClick={() => presentSelection(verse.v)}
                title="Click to select · Ctrl-click to extend · Shift+↑/↓ to grow · Double-click to present this verse"
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "9px 12px",
                  borderRadius: 10,
                  cursor: "pointer",
                  marginBottom: 2,
                  background: selected
                    ? "rgba(216,162,74,0.13)"
                    : reading
                      ? "rgba(80,116,168,0.14)"
                      : "transparent",
                  border: `1px solid ${
                    selected
                      ? "rgba(216,162,74,0.35)"
                      : reading
                        ? "rgba(120,160,220,0.4)"
                        : "transparent"
                  }`,
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
                    color: selected || reading ? C.text : C.sub,
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
          <span
            style={{
              fontFamily: UI,
              fontSize: 13.5,
              fontWeight: 600,
              color: C.goldSoft,
            }}
          >
            {formatRange({
              bookId,
              bookName: book.name,
              chapter,
              verseStart: selStart as number,
              verseEnd: selEnd as number,
            })}
          </span>
          <span style={{ fontFamily: UI, fontSize: 12, color: C.dim }}>
            {selectedVerses.length} verse
            {selectedVerses.length === 1 ? "" : "s"}
          </span>
          <span style={{ flex: 1 }} />
          <Btn size="sm" variant="primary" onClick={() => presentSelection()}>
            <Play size={13} />
            Present
          </Btn>
          <Btn
            size="sm"
            variant="ghost"
            onClick={editSelection}
            title="Edit these verses as slides before presenting"
          >
            <Pencil size={13} />
            Edit
          </Btn>
          {speech.supported && (
            <Btn
              size="sm"
              variant="ghost"
              onClick={() =>
                speech.speaking ? speech.stop() : readAloud(selectedVerses)
              }
            >
              {speech.speaking ? <Square size={13} /> : <Volume2 size={13} />}
              {speech.speaking ? "Stop" : "Read"}
            </Btn>
          )}
          <Btn
            size="sm"
            variant="ghost"
            onClick={() => setPendingSave(buildSelection())}
          >
            <BookmarkPlus size={13} />
            Save passage
          </Btn>
          <IconBtn
            icon={X}
            title="Clear selection"
            onClick={() => setSelection(null)}
          />
        </div>
      )}

      <SavePassageModal
        selection={pendingSave}
        onClose={() => setPendingSave(null)}
        onSave={saveSelection}
      />

      <DuplicatePassageModal
        existingTitle={duplicatePrompt?.existing.title ?? null}
        onOverwrite={overwriteDuplicate}
        onSaveCopy={saveDuplicateCopy}
        onClose={() => setDuplicatePrompt(null)}
      />
    </div>
  );
}

export const FIRST_BOOK_ID = BIBLE_BOOKS[0].id;
