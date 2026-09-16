import type { BibleBook } from "../../data/bibleBooks";
import { useUITheme } from "../../theme/ThemeProvider";
import { tileStyle } from "./tileStyle";

export const ChaptersStep = ({
  book,
  chapter,
  onOpenChapter,
}: {
  book: BibleBook;
  chapter: number;
  onOpenChapter: (chapter: number) => void;
}) => {
  const { colors, fonts } = useUITheme();
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
      <h2
        style={{
          fontFamily: fonts.display,
          fontSize: 22,
          fontWeight: 600,
          color: colors.text,
          margin: "2px 0 4px",
        }}
      >
        {book.name}
      </h2>
      <p
        style={{
          fontFamily: fonts.ui,
          fontSize: 13,
          color: colors.sub,
          margin: "0 0 16px",
        }}
      >
        Pick a chapter to continue.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(56px,1fr))",
          gap: 8,
        }}
      >
        {Array.from({ length: book.chapters }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            onClick={() => onOpenChapter(n)}
            style={tileStyle(n === chapter)}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
};
