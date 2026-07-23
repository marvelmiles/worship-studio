import { BookOpen, RotateCcw } from "lucide-react";
import type { BibleVersionId } from "../../types";
import type { BibleBook } from "../../data/bibleBooks";
import { colors, DISPLAY, UI } from "../../theme/tokens";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { useBibleChapter } from "./useBibleChapter";
import { tileStyle } from "./tileStyle";

/**
 * Third step of the Bible read tab: the verse-number grid for one chapter,
 * with a shortcut to read the whole chapter instead.
 */
export function VersesStep({
  version,
  book,
  chapter,
  onOpenVerse,
  onReadWholeChapter,
}: {
  version: BibleVersionId;
  book: BibleBook;
  chapter: number;
  onOpenVerse: (verse: number) => void;
  onReadWholeChapter: () => void;
}) {
  const { verses, loading, error, retry } = useBibleChapter(
    version,
    book.id,
    chapter,
  );

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        paddingRight: 6,
        paddingBottom: 12,
      }}
    >
      <div
        className="ws-row-wrap"
        style={{ alignItems: "center", marginBottom: 4 }}
      >
        <h2
          style={{
            fontFamily: DISPLAY,
            fontSize: 22,
            fontWeight: 600,
            color: colors.text,
            margin: "2px 0",
          }}
        >
          {book.name} {chapter}
        </h2>
        <span style={{ flex: 1 }} />
        <Button variant="primary" onClick={onReadWholeChapter}>
          <BookOpen size={15} />
          Read full chapter
        </Button>
      </div>
      <p
        style={{
          fontFamily: UI,
          fontSize: 13,
          color: colors.sub,
          margin: "0 0 16px",
        }}
      >
        Jump straight to a verse, or read the whole chapter.
      </p>
      {loading && (
        <div style={{ padding: 36, display: "grid", placeItems: "center" }}>
          <Spinner size={26} />
        </div>
      )}
      {!loading && error && (
        <div style={{ padding: 26, textAlign: "center" }}>
          <p
            style={{
              fontFamily: UI,
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
      {!loading && !error && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(56px,1fr))",
            gap: 8,
          }}
        >
          {verses.map((verse) => (
            <button
              key={verse.v}
              onClick={() => onOpenVerse(verse.v)}
              title={
                verse.t.length > 140 ? `${verse.t.slice(0, 140)}…` : verse.t
              }
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
