import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import type { BibleVerse, BibleVersionId } from "../../types";
import { bookById } from "../../data/bibleBooks";
import { useUITheme } from "../../theme/ThemeProvider";
import { useStore } from "../../store/useStore";
import type { ScriptureSelection } from "../../store/useStore";
import { useSpeech } from "../../hooks/useSpeech";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { useBibleChapter } from "./useBibleChapter";
import { usePresentScripture } from "./usePresentScripture";
import { buildScriptureSelection } from "./lib/scriptureSelection";
import { parseReference, referenceSpan, type VerseSpan } from "./lib/reference";
import { ChapterToolbar } from "./reader/ChapterToolbar";
import { SelectionActionBar } from "./reader/SelectionActionBar";
import { useSavePassageFlow } from "./reader/useSavePassageFlow";
import { useVerseSelection } from "./reader/useVerseSelection";
import { VerseRow } from "./reader/VerseRow";
import { SavePassageModal } from "./SavePassageModal";
import { DuplicatePassageModal } from "./DuplicatePassageModal";

const FIRST_BOOK_ID = 1;
const LAST_BOOK_ID = 66;

interface BibleReaderProps {
  version: BibleVersionId;
  bookId: number;
  chapter: number;
  focusRange?: VerseSpan | null;
  onNavigate: (bookId: number, chapter: number) => void;
  onCurrentVerseChange?: (verse: number | null) => void;
}

export const BibleReader = ({
  version,
  bookId,
  chapter,
  focusRange,
  onNavigate,
  onCurrentVerseChange,
}: BibleReaderProps) => {
  const { colors, fonts, glass } = useUITheme();
  const pushToast = useStore((s) => s.pushToast);
  const { present, edit } = usePresentScripture();
  const { verses, loading, error, retry } = useBibleChapter(
    version,
    bookId,
    chapter,
  );
  const [reference, setReference] = useState("");
  const [readingVerse, setReadingVerse] = useState<number | null>(null);
  const speech = useSpeech();
  const book = bookById(bookId);

  const selection = useVerseSelection({
    verses,
    focusRange,
    chapterKey: `${version}:${bookId}:${chapter}`,
    isLoading: loading,
  });
  const savePassage = useSavePassageFlow();
  const { selectionStart, selectionEnd, selectedVerses } = selection;

  useEffect(() => {
    speech.stop();
  }, [version, bookId, chapter, speech.stop]);

  useEffect(() => {
    if (!speech.speaking) setReadingVerse(null);
  }, [speech.speaking]);

  useEffect(() => {
    onCurrentVerseChange?.(readingVerse ?? selectionStart);
  }, [readingVerse, selectionStart, onCurrentVerseChange]);

  const buildSelection = (): ScriptureSelection | null => {
    if (selectionStart === null || selectionEnd === null) return null;
    return buildScriptureSelection({
      version,
      bookId,
      chapter,
      verseStart: selectionStart,
      verseEnd: selectionEnd,
      verses,
    });
  };

  const jumpToReference = () => {
    const parsed = parseReference(reference);
    if (!parsed) {
      pushToast(
        "Couldn't read that reference. Try something like John 3:16-18.",
        "error",
      );
      return;
    }
    const span = referenceSpan(parsed);
    const target = { anchor: span.start, focus: span.end };
    if (parsed.book.id === bookId && parsed.chapter === chapter) {
      selection.setSelection(target);
      selection.scrollToVerse(span.start);
    } else {
      selection.selectAfterNavigation(target, span.start);
      onNavigate(parsed.book.id, parsed.chapter);
    }
    setReference("");
  };

  const goChapter = (delta: number) => {
    let nextBook = bookId;
    let nextChapter = chapter + delta;
    if (book && nextChapter > book.chapters) {
      if (bookId >= LAST_BOOK_ID) return;
      nextBook = bookId + 1;
      nextChapter = 1;
    } else if (nextChapter < 1) {
      if (bookId <= FIRST_BOOK_ID) return;
      nextBook = bookId - 1;
      nextChapter = bookById(nextBook)?.chapters || 1;
    }
    onNavigate(nextBook, nextChapter);
  };

  const readAloud = (list: BibleVerse[]) => {
    if (!list.length) return;
    speech.speak(
      list.map((verse) => verse.t),
      (index) => {
        const verse = list[index]?.v;
        if (verse === undefined) return;
        setReadingVerse(verse);
        selection.scrollToVerse(verse, "nearest");
      },
    );
  };

  const toggleReadAloud = (list: BibleVerse[]) => () =>
    speech.speaking ? speech.stop() : readAloud(list);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        height: "100%",
      }}
    >
      <ChapterToolbar
        reference={reference}
        onReferenceChange={setReference}
        onJumpToReference={jumpToReference}
        isAllSelected={selection.isAllSelected}
        onToggleSelectAll={selection.toggleSelectAll}
        isSpeechSupported={speech.supported}
        isSpeaking={speech.speaking}
        onToggleReadAloud={toggleReadAloud(verses)}
        chapterLabel={`${book?.name ?? ""} ${chapter}`}
        onPreviousChapter={() => goChapter(-1)}
        onNextChapter={() => goChapter(1)}
      />

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          paddingRight: 6,
          paddingBottom: selection.selection ? 76 : 12,
        }}
      >
        {loading && (
          <div style={{ padding: 40, display: "grid", placeItems: "center" }}>
            <Spinner size={26} />
          </div>
        )}
        {!loading && error && (
          <div style={{ ...glass, padding: 28, textAlign: "center" }}>
            <p
              style={{
                fontFamily: fonts.ui,
                color: colors.sub,
                marginTop: 0,
                lineHeight: 1.6,
              }}
            >
              {error}
            </p>
            <Button variant="primary" onClick={retry}>
              <RotateCcw size={14} />
              Try again
            </Button>
          </div>
        )}
        {!loading &&
          !error &&
          verses.map((verse) => (
            <VerseRow
              key={verse.v}
              verse={verse}
              isSelected={
                selectionStart !== null &&
                selectionEnd !== null &&
                verse.v >= selectionStart &&
                verse.v <= selectionEnd
              }
              isBeingRead={readingVerse === verse.v}
              onRef={(element) => selection.registerVerseRef(verse.v, element)}
              onSelect={(extend) => selection.selectVerse(verse.v, extend)}
              onPresent={() =>
                present(
                  buildScriptureSelection({
                    version,
                    bookId,
                    chapter,
                    verseStart: verse.v,
                    verses,
                  }),
                )
              }
            />
          ))}
      </div>

      {selection.selection && selectedVerses.length > 0 && book && (
        <SelectionActionBar
          range={{
            bookId,
            bookName: book.name,
            chapter,
            verseStart: selectionStart as number,
            verseEnd: selectionEnd as number,
          }}
          verseCount={selectedVerses.length}
          buildSelection={buildSelection}
          onEdit={() => edit(buildSelection())}
          isSpeechSupported={speech.supported}
          isSpeaking={speech.speaking}
          onToggleReadAloud={toggleReadAloud(selectedVerses)}
          onSave={() => savePassage.setPendingSave(buildSelection())}
          onClear={selection.clearSelection}
        />
      )}

      <SavePassageModal
        selection={savePassage.pendingSave}
        onClose={() => savePassage.setPendingSave(null)}
        onSave={savePassage.saveSelection}
      />

      <DuplicatePassageModal
        existingTitle={savePassage.duplicateTitle}
        onOverwrite={savePassage.overwriteDuplicate}
        onSaveCopy={savePassage.saveDuplicateAsCopy}
        onClose={savePassage.closeDuplicatePrompt}
      />
    </div>
  );
};
