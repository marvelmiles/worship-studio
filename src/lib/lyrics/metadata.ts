import { matchSectionHeader } from "./sections";
import { matchDelimitedStanzaNumber } from "./numbering";

export interface SongMetadata {
  title: string | null;
  artist: string | null;
  /** Leading lines the heading occupied; the parser skips them. */
  consumed: number;
}

const EMPTY: SongMetadata = { title: null, artist: null, consumed: 0 };

/** Lyric sites end their heading with the word "Lyrics". */
const LYRICS_SUFFIX = /\s*\blyrics?\b\s*$/i;
const TRAILING_PARENTHETICAL = /\s*[([][^()[\]]*[)\]]\s*$/;
/** A separator only counts with space around it, so hyphenated words survive. */
const NAME_SEPARATOR = /\s+[—–|]\s+|\s+-\s+/;
const CREDIT_LINE =
  /^\s*(?:artiste?|composer|written\s+by|performed\s+by|sung\s+by)\s*[:\-–—]?\s*(.+)$/i;
const BY_LINE = /^\s*by\s+(.{2,60})$/i;

/** ALL-CAPS headings are shouting; give them back their shape. */
function normalizeCase(value: string): string {
  if (/[a-z]/.test(value) || value.length < 4) return value;
  return value
    .toLowerCase()
    .replace(
      /(^|[\s(/-])([a-z])/g,
      (_m, lead: string, letter: string) => lead + letter.toUpperCase(),
    );
}

const clean = (value: string): string =>
  normalizeCase(value.trim().replace(/^[\s"'`]+|[\s"'`]+$/g, ""));

function looksLikeSection(line: string): boolean {
  return matchSectionHeader(line) !== null;
}

/**
 * Reads a song heading off the top of a pasted document: `TITLE — ARTIST`,
 * `Artist – Title Lyrics`, or a bare title sitting above the first section.
 *
 * A heading only counts when it announces itself, either by ending in
 * "Lyrics", by carrying a spaced separator, or by standing alone above a
 * section header. Anything less certain is left alone and sung as a lyric.
 */
export function extractSongMetadata(lines: string[]): SongMetadata {
  const first = lines.findIndex((line) => line.trim() !== "");
  if (first === -1) return EMPTY;

  const line = lines[first].trim();
  if (looksLikeSection(line)) return EMPTY;
  if (matchDelimitedStanzaNumber(line) !== null) return EMPTY;

  let heading = line.replace(TRAILING_PARENTHETICAL, "").trim();
  const fromLyricsSite = LYRICS_SUFFIX.test(heading);
  if (fromLyricsSite) heading = heading.replace(LYRICS_SUFFIX, "").trim();

  const parts = heading.split(NAME_SEPARATOR).filter((part) => part.trim());
  const separated = parts.length === 2;

  const next = lines.slice(first + 1).find((value) => value.trim() !== "");
  const standsAboveSection = Boolean(
    next && looksLikeSection(next) && lines[first + 1]?.trim() === "",
  );

  if (!heading || (!fromLyricsSite && !separated && !standsAboveSection))
    return EMPTY;

  // "Artist – Title Lyrics" is how lyric sites head a page; a document a
  // person typed themselves reads "Title — Artist".
  const [title, artist] = separated
    ? fromLyricsSite
      ? [parts[1], parts[0]]
      : [parts[0], parts[1]]
    : [heading, null];

  const metadata: SongMetadata = {
    title: clean(title) || null,
    artist: artist ? clean(artist) || null : null,
    consumed: first + 1,
  };

  if (metadata.artist) return metadata;

  // A credit on the line below the heading, e.g. "By Fanny Crosby".
  for (let i = first + 1; i < lines.length; i++) {
    const candidate = lines[i].trim();
    if (!candidate) continue;
    if (looksLikeSection(candidate)) break;
    const credit = candidate.match(CREDIT_LINE) || candidate.match(BY_LINE);
    if (!credit || credit[1].trim().split(/\s+/).length > 6) break;
    metadata.artist = clean(credit[1]) || null;
    metadata.consumed = i + 1;
    break;
  }

  return metadata;
}
