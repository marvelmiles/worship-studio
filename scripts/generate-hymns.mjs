import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { readHymnalSource } from "../src/lib/manuscript/hymnal.ts";
import { compareLibraryNames } from "../src/lib/librarySort.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const SOURCE_REPOSITORY = "https://github.com/freehymns/hymns.git";
const CACHE_DIRECTORY = join(root, ".cache/freehymns");
const OUTPUT_FILE = join(root, "src/data/hymns.json");

const LIFE_DATES = /\s*\((?=[^)]*\d)[^)]*\)\s*$/;
const TRAILING_YEAR = /\s*,\s*c?\.?\s*\d{3,4}(?:\s*[-–]\s*\d{3,4})?\s*$/;

const argumentSource = process.argv
  .find((value) => value.startsWith("--source="))
  ?.slice("--source=".length);

const resolveSource = () => {
  const provided = argumentSource ?? process.env.HYMNS_SOURCE;
  if (provided) {
    if (!existsSync(join(provided, "en")))
      throw new Error(`No "en" directory under ${provided}`);
    return provided;
  }
  if (!existsSync(CACHE_DIRECTORY)) {
    mkdirSync(dirname(CACHE_DIRECTORY), { recursive: true });
    console.log(`Cloning ${SOURCE_REPOSITORY} into .cache/freehymns`);
    execFileSync("git", ["clone", "--depth", "1", SOURCE_REPOSITORY, CACHE_DIRECTORY], {
      stdio: "inherit",
    });
  }
  return CACHE_DIRECTORY;
};

const listFiles = (directory) => {
  const found = [];
  const walk = (current) => {
    for (const entry of readdirSync(current).sort()) {
      if (entry.startsWith(".")) continue;
      const path = join(current, entry);
      if (statSync(path).isDirectory()) walk(path);
      else found.push(path);
    }
  };
  walk(directory);
  return found;
};

const slugFor = (path) => {
  const name = path.split(/[\\/]/).pop().replace(/\.txt$/i, "");
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
};

const cleanAuthor = (author) => {
  if (!author) return "";
  const trimmed = author.replace(LIFE_DATES, "").replace(TRAILING_YEAR, "").trim();
  return trimmed.replace(/\s*,\s*$/, "");
};

const keyOf = (path, base) =>
  relative(base, path).replace(/\.(txt|abc)$/i, "").split(sep).join("/");

const compare = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "");

/**
 * Reads the header fields of an ABC tune file. The `w:` lines carry the sung
 * syllables, which the hymn text already supplies, so they are skipped.
 */
const readAbcHeaders = (text) => {
  const headers = {};
  for (const line of text.replace(/\r\n?/g, "\n").split("\n")) {
    const match = line.match(/^([A-Za-z]):\s*(.*)$/);
    if (!match) continue;
    const [, field, value] = match;
    if (field === "w") continue;
    (headers[field] ??= []).push(value.trim());
  }
  return headers;
};

const prefixed = (headers, prefix) => {
  const wanted = `${prefix}:`.toLowerCase();
  for (const value of [...(headers.Z ?? []), ...(headers.A ?? [])]) {
    if (value.toLowerCase().startsWith(wanted))
      return value.slice(wanted.length).trim();
  }
  return "";
};

/**
 * Only tunes the corpus marks as public domain are carried over. Files that
 * claim a lapsed copyright, credit an arranger instead of stating terms, or
 * state nothing at all are left out rather than guessed at.
 */
const isPublicDomain = (headers) => /public\s+domain/i.test(prefixed(headers, "Terms"));

const readMusic = (text, title) => {
  const headers = readAbcHeaders(text);
  if (!isPublicDomain(headers)) return null;

  const tune = (headers.T ?? [])[0] ?? "";
  const tempo = ((headers.Q ?? [])[0] ?? "").match(/=\s*(\d{2,3})/);
  const music = {
    // A tune file named after its hymn repeats the title, which is no tune name.
    tune: compare(tune) === compare(title) ? "" : tune,
    composer: cleanAuthor((headers.C ?? [])[0] ?? ""),
    meter: (headers.M ?? [])[0] ?? "",
    key: (headers.K ?? [])[0] ?? "",
    tempo: tempo ? Number(tempo[1]) : 0,
    source: prefixed(headers, "Sources"),
  };

  for (const [field, value] of Object.entries(music))
    if (!value) delete music[field];
  return Object.keys(music).length ? music : null;
};

const source = resolveSource();
const hymnBase = join(source, "en");
const musicBase = join(source, "music");
const files = listFiles(hymnBase);
if (!files.length) throw new Error(`No hymn files found under ${source}/en`);

/* Tunes are keyed by the path they share with the hymn text, falling back to
   the tune's own title. The rest of the music folder is a general tune library
   belonging to no hymn in the corpus, so it is left alone. */
const musicByPath = new Map();
const musicByTitle = new Map();
if (existsSync(musicBase)) {
  for (const file of listFiles(musicBase)) {
    const text = readFileSync(file, "utf8");
    musicByPath.set(keyOf(file, musicBase), text);
    const tune = (readAbcHeaders(text).T ?? [])[0];
    if (tune && !musicByTitle.has(compare(tune)))
      musicByTitle.set(compare(tune), text);
  }
}

const hymns = [];
const seenIds = new Map();
let restrictedTunes = 0;

for (const file of files) {
  const { text, author } = readHymnalSource(readFileSync(file, "utf8"), {
    syllabified: true,
  });
  const lines = text.split("\n");
  const title = lines[0]?.trim();
  const body = lines.slice(1).join("\n").trim();

  if (!title) throw new Error(`${file}: no title on the first line`);
  if (!body) throw new Error(`${file}: no text after the title`);

  const id = `hymn-${slugFor(file)}`;
  const clash = seenIds.get(id);
  if (clash) throw new Error(`Duplicate id "${id}" from ${clash} and ${file}`);
  seenIds.set(id, file);

  const hymn = { id, title, author: cleanAuthor(author), body };
  const tuneFile =
    musicByPath.get(keyOf(file, hymnBase)) ?? musicByTitle.get(compare(title));
  if (tuneFile) {
    const music = readMusic(tuneFile, title);
    if (music) hymn.music = music;
    else restrictedTunes++;
  }
  hymns.push(hymn);
}

for (const hymn of hymns) {
  const offending = hymn.body
    .split("\n")
    .find((line) => line.includes("@") || /^(?:author|words|music|composer|translator|tune)\b[^:]{0,32}:/i.test(line));
  if (offending)
    throw new Error(`${hymn.id}: music cue or credit line survived normalization`);
  if (!/^[A-Za-z][^\n]*:\s*$|^\[/m.test(hymn.body))
    throw new Error(`${hymn.id}: no section heading found`);
}

/* Seeding stamps the hymns in this order, newest first, so the order here is
   the order the library shows. It uses the app's own comparator so the default
   view and the explicit Title A-Z sort agree. */
hymns.sort((a, b) => compareLibraryNames(a.title, b.title));

writeFileSync(OUTPUT_FILE, `${JSON.stringify(hymns, null, 0)}\n`);

const withAuthor = hymns.filter((hymn) => hymn.author).length;
const withMusic = hymns.filter((hymn) => hymn.music).length;
const bytes = statSync(OUTPUT_FILE).size;
console.log(
  `Wrote src/data/hymns.json: ${hymns.length} hymns, ${withAuthor} with an author, ${(bytes / 1024).toFixed(0)} KB`,
);
console.log(
  `Tunes: ${withMusic} hymns carry public-domain music details, ${restrictedTunes} matched a tune whose terms are unclear and were left out`,
);
