import type { Collection } from "./collections";
import type { HymnMusic, TextStyle } from "../types";

export interface HymnSource {
  id: string;
  title: string;
  author: string;
  body: string;
  music?: HymnMusic;
}

/**
 * Bumped whenever the generated hymnal changes, so an install that already has
 * an older set reconciles its built-in manuscripts on the next load.
 */
export const HYMNAL_VERSION = 3;

export const HYMN_COLLECTION: Collection = "Hymns";

export const HYMN_THEME_ID = "hymnbook";

export const HYMN_BACKGROUND_ID = "bg-parchment";

/**
 * Hymn stanzas are short, so four lines a slide keeps the text clear of the
 * top and bottom edges instead of filling the frame; longer sections simply
 * break across more slides.
 */
export const HYMN_MAX_LINES = 4;

/**
 * The slide canvas is 16:9 (56.25cqw tall) and reserves 7cqw above and below
 * the text, leaving 42.25cqw. Four lines at this size and the Hymn Book theme's
 * 1.3 line height take 20.8cqw, and even if every line wrapped they would take
 * 41.6cqw, so a stanza always sits clear of the top and bottom edges.
 */
export const HYMN_STYLE: TextStyle = { fontSize: 4 };

/**
 * The hymnal is a large payload that is only read when the library is seeded,
 * so it is split out of the main bundle. The service worker precaches the
 * chunk, which keeps the first offline start working.
 */
export const loadHymns = async (): Promise<readonly HymnSource[]> =>
  (await import("./hymns.json")).default;
