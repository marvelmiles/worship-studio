import type { BibleVersionId } from "../types";

export interface BibleVersion {
  id: BibleVersionId;
  name: string;
}

// Only public-domain translations are offered: their full text is bundled
// with the app (via the MIT-licensed holy-bible package) and can be
// distributed freely. Copyrighted translations (NIV, ESV, NLT, NKJV…) cannot
// legally ship inside the bundle, so they are intentionally absent.
export const BIBLE_VERSIONS: BibleVersion[] = [
  { id: "KJV", name: "King James Version" },
  { id: "ASV", name: "American Standard Version" },
];

export const DEFAULT_BIBLE_VERSION: BibleVersionId = "KJV";

/** Narrows any stored/legacy version string to a supported translation. */
export const isBibleVersion = (value: string): value is BibleVersionId =>
  BIBLE_VERSIONS.some((v) => v.id === value);

export interface BibleBook {
  id: number;
  name: string;
  chapters: number;
  testament: "old" | "new";
  aliases: string[];
}

const book = (
  id: number,
  name: string,
  chapters: number,
  testament: "old" | "new",
  aliases: string[] = [],
): BibleBook => ({ id, name, chapters, testament, aliases });

export const BIBLE_BOOKS: BibleBook[] = [
  book(1, "Genesis", 50, "old", ["gen", "ge", "gn"]),
  book(2, "Exodus", 40, "old", ["exo", "ex", "exod"]),
  book(3, "Leviticus", 27, "old", ["lev", "le", "lv"]),
  book(4, "Numbers", 36, "old", ["num", "nu", "nm", "nb"]),
  book(5, "Deuteronomy", 34, "old", ["deut", "deu", "dt"]),
  book(6, "Joshua", 24, "old", ["josh", "jos", "jsh"]),
  book(7, "Judges", 21, "old", ["judg", "jdg", "jg", "jdgs"]),
  book(8, "Ruth", 4, "old", ["rth", "ru"]),
  book(9, "1 Samuel", 31, "old", ["1sam", "1sa", "1sm", "1s"]),
  book(10, "2 Samuel", 24, "old", ["2sam", "2sa", "2sm", "2s"]),
  book(11, "1 Kings", 22, "old", ["1kgs", "1ki", "1kin", "1k"]),
  book(12, "2 Kings", 25, "old", ["2kgs", "2ki", "2kin", "2k"]),
  book(13, "1 Chronicles", 29, "old", ["1chr", "1ch", "1chron"]),
  book(14, "2 Chronicles", 36, "old", ["2chr", "2ch", "2chron"]),
  book(15, "Ezra", 10, "old", ["ezr", "ez"]),
  book(16, "Nehemiah", 13, "old", ["neh", "ne"]),
  book(17, "Esther", 10, "old", ["esth", "est", "es"]),
  book(18, "Job", 42, "old", ["jb"]),
  book(19, "Psalms", 150, "old", ["psalm", "ps", "psa", "psm", "pss"]),
  book(20, "Proverbs", 31, "old", ["prov", "pro", "prv", "pr"]),
  book(21, "Ecclesiastes", 12, "old", ["eccl", "ecc", "ec", "qoh"]),
  book(22, "Song of Solomon", 8, "old", [
    "song",
    "sos",
    "so",
    "canticles",
    "songofsongs",
  ]),
  book(23, "Isaiah", 66, "old", ["isa", "is"]),
  book(24, "Jeremiah", 52, "old", ["jer", "je", "jr"]),
  book(25, "Lamentations", 5, "old", ["lam", "la"]),
  book(26, "Ezekiel", 48, "old", ["ezek", "eze", "ezk"]),
  book(27, "Daniel", 12, "old", ["dan", "da", "dn"]),
  book(28, "Hosea", 14, "old", ["hos", "ho"]),
  book(29, "Joel", 3, "old", ["joe", "jl"]),
  book(30, "Amos", 9, "old", ["am"]),
  book(31, "Obadiah", 1, "old", ["obad", "oba", "ob"]),
  book(32, "Jonah", 4, "old", ["jon", "jnh"]),
  book(33, "Micah", 7, "old", ["mic", "mc"]),
  book(34, "Nahum", 3, "old", ["nah", "na"]),
  book(35, "Habakkuk", 3, "old", ["hab", "hb"]),
  book(36, "Zephaniah", 3, "old", ["zeph", "zep", "zp"]),
  book(37, "Haggai", 2, "old", ["hag", "hg"]),
  book(38, "Zechariah", 14, "old", ["zech", "zec", "zc"]),
  book(39, "Malachi", 4, "old", ["mal", "ml"]),
  book(40, "Matthew", 28, "new", ["matt", "mat", "mt"]),
  book(41, "Mark", 16, "new", ["mrk", "mk", "mr"]),
  book(42, "Luke", 24, "new", ["luk", "lk"]),
  book(43, "John", 21, "new", ["jn", "jhn", "joh"]),
  book(44, "Acts", 28, "new", ["act", "ac"]),
  book(45, "Romans", 16, "new", ["rom", "ro", "rm"]),
  book(46, "1 Corinthians", 16, "new", ["1cor", "1co", "1c"]),
  book(47, "2 Corinthians", 13, "new", ["2cor", "2co", "2c"]),
  book(48, "Galatians", 6, "new", ["gal", "ga"]),
  book(49, "Ephesians", 6, "new", ["eph", "ep"]),
  book(50, "Philippians", 4, "new", ["phil", "php", "pp"]),
  book(51, "Colossians", 4, "new", ["col", "co"]),
  book(52, "1 Thessalonians", 5, "new", ["1thess", "1thes", "1th"]),
  book(53, "2 Thessalonians", 3, "new", ["2thess", "2thes", "2th"]),
  book(54, "1 Timothy", 6, "new", ["1tim", "1ti", "1tm"]),
  book(55, "2 Timothy", 4, "new", ["2tim", "2ti", "2tm"]),
  book(56, "Titus", 3, "new", ["tit", "ti"]),
  book(57, "Philemon", 1, "new", ["phlm", "phm", "pm"]),
  book(58, "Hebrews", 13, "new", ["heb", "he"]),
  book(59, "James", 5, "new", ["jas", "jm"]),
  book(60, "1 Peter", 5, "new", ["1pet", "1pe", "1pt", "1p"]),
  book(61, "2 Peter", 3, "new", ["2pet", "2pe", "2pt", "2p"]),
  book(62, "1 John", 5, "new", ["1jn", "1jhn", "1joh", "1j"]),
  book(63, "2 John", 1, "new", ["2jn", "2jhn", "2joh", "2j"]),
  book(64, "3 John", 1, "new", ["3jn", "3jhn", "3joh", "3j"]),
  book(65, "Jude", 1, "new", ["jud", "jd"]),
  book(66, "Revelation", 22, "new", ["rev", "re", "rv", "apocalypse"]),
];

export const bookById = (id: number): BibleBook | undefined =>
  BIBLE_BOOKS.find((b) => b.id === id);

export const OLD_TESTAMENT = BIBLE_BOOKS.filter((b) => b.testament === "old");
export const NEW_TESTAMENT = BIBLE_BOOKS.filter((b) => b.testament === "new");
