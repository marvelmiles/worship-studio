import type { BibleBook } from "../../data/bibleBooks";
import { C, DISPLAY, UI } from "../../theme/tokens";
import { tileStyle } from "./tileStyle";

/** Second step of the Bible read tab: the chapter-number grid for one book. */
export function ChaptersStep({
  book,
  chapter,
  onOpenChapter,
}: {
  book: BibleBook;
  /** Currently remembered chapter — shown highlighted. */
  chapter: number;
  onOpenChapter: (chapter: number) => void;
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
          <button key={n} onClick={() => onOpenChapter(n)} style={tileStyle(n === chapter)}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
