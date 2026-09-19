import type { Collection } from "./collections";
import type { HymnMusic, TextStyle } from "../types";
import { DEFAULT_SLIDE_FONT_SIZE, slideRowCapacity } from "../lib/slideLayout";
import { builtInTheme } from "./themes";

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
export const HYMNAL_VERSION = 4;

export const HYMN_COLLECTION: Collection = "Hymns";

export const HYMN_THEME_ID = "hymnbook";

export const HYMN_BACKGROUND_ID = "bg-parchment";

/** Hymns read at the app-wide slide size, straight from the Hymn Book theme. */
export const HYMN_STYLE: TextStyle = { fontSize: DEFAULT_SLIDE_FONT_SIZE };

/**
 * The height budget already cuts a stanza wherever the next line would not fit,
 * so this is only the upper bound: the lines a slide could hold if none of them
 * wrapped at all.
 */
export const HYMN_MAX_LINES = slideRowCapacity({
  fontSize: HYMN_STYLE.fontSize ?? DEFAULT_SLIDE_FONT_SIZE,
  lineHeight: builtInTheme(HYMN_THEME_ID)?.lineHeight ?? 1.3,
});

/**
 * The hymnal is a large payload that is only read when the library is seeded,
 * so it is split out of the main bundle. The service worker precaches the
 * chunk, which keeps the first offline start working.
 */
export const loadHymns = async (): Promise<readonly HymnSource[]> =>
  (await import("./hymns.json")).default;
