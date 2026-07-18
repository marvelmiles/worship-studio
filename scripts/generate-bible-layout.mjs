// Generates src/data/bibleLayout.ts from the holy-bible package's verse index.
//
// The holy-bible package (MIT) ships each translation as a flat array of verse
// strings in canonical order (Genesis 1:1 → Revelation 22:21) plus an index
// mapping zero-padded verse ids (BBCCCVVV) to array positions. This script
// derives the verses-per-chapter layout from that index, verifies the array
// order really is canonical (so chapter lookup can be plain offset arithmetic),
// and cross-checks the book list against src/data/bibleBooks.ts.
//
// Re-run after upgrading holy-bible:  pnpm run generate:bible-layout

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const map = JSON.parse(
  readFileSync(join(root, "node_modules/holy-bible/indexes/verse-index-map.json"), "utf8")
);

// layout[bookId - 1][chapter - 1] = number of verse slots in that chapter.
const layout = [];
for (const key of Object.keys(map)) {
  const id = Number(key);
  const book = Math.floor(id / 1e6);
  const chapter = Math.floor(id / 1000) % 1000;
  const verse = id % 1000;
  const chapters = (layout[book - 1] ??= []);
  chapters[chapter - 1] = Math.max(chapters[chapter - 1] ?? 0, verse);
}

if (layout.length !== 66) throw new Error(`Expected 66 books, got ${layout.length}`);

// Verify the flat verse arrays follow canonical order exactly.
let index = 0;
for (let b = 1; b <= 66; b++) {
  for (let c = 1; c <= layout[b - 1].length; c++) {
    for (let v = 1; v <= layout[b - 1][c - 1]; v++) {
      const key = String(b * 1e6 + c * 1000 + v).padStart(8, "0");
      if (map[key] !== index) {
        throw new Error(`Corpus not in canonical order at ${b}:${c}:${v} (index ${index})`);
      }
      index++;
    }
  }
}

// Cross-check chapter counts against the app's book metadata.
const booksSrc = readFileSync(join(root, "src/data/bibleBooks.ts"), "utf8");
for (const m of booksSrc.matchAll(/book\((\d+), "([^"]+)", (\d+)/g)) {
  const [, id, name, chapters] = m;
  if (layout[Number(id) - 1].length !== Number(chapters)) {
    throw new Error(
      `${name}: bibleBooks.ts says ${chapters} chapters, index says ${layout[Number(id) - 1].length}`
    );
  }
}

const rows = layout.map((chapters) => `  [${chapters.join(",")}],`).join("\n");
const out = `// GENERATED FILE — do not edit by hand.
// Built by scripts/generate-bible-layout.mjs (run: pnpm run generate:bible-layout).
//
// The holy-bible package stores each translation as ONE flat array of
// ${index} verse strings in reading order (Genesis 1:1 first, Revelation
// 22:21 last) with no book/chapter structure of its own. This table supplies
// that structure: how many verses each chapter has. Adding up the chapters
// before the one you want gives its start position in the flat array —
// that's all chapterStartPosition() does.

/** Verses in a chapter: CHAPTER_VERSE_COUNTS[bookId - 1][chapter - 1]. */
export const CHAPTER_VERSE_COUNTS: readonly (readonly number[])[] = [
${rows}
];

// Where each book starts in the flat verse array, computed once.
const bookStartPositions: number[] = [];
{
  let position = 0;
  for (const chapters of CHAPTER_VERSE_COUNTS) {
    bookStartPositions.push(position);
    for (const verseCount of chapters) position += verseCount;
  }
}

/**
 * Position of a chapter's first verse inside the flat verse array, or -1
 * when the book/chapter doesn't exist.
 */
export function chapterStartPosition(bookId: number, chapter: number): number {
  const chapters = CHAPTER_VERSE_COUNTS[bookId - 1];
  if (!chapters || chapter < 1 || chapter > chapters.length) return -1;
  let position = bookStartPositions[bookId - 1];
  for (let c = 1; c < chapter; c++) position += chapters[c - 1];
  return position;
}
`;

writeFileSync(join(root, "src/data/bibleLayout.ts"), out);
console.log(`Wrote src/data/bibleLayout.ts (${index} verse slots, 66 books)`);
