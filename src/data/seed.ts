import type { Manuscript } from "../types";
import { now } from "../lib/id";
import { parseManuscriptSlides } from "../lib/parser";
import {
  HYMN_BACKGROUND_ID,
  HYMN_COLLECTION,
  HYMN_MAX_LINES,
  HYMN_STYLE,
  HYMN_THEME_ID,
  loadHymns,
} from "./hymns";
import type { HymnSource } from "./hymns";

const buildManuscript = (hymn: HymnSource, timestamp: string): Manuscript => ({
  id: hymn.id,
  title: hymn.title,
  author: hymn.author,
  collection: HYMN_COLLECTION,
  defaultThemeId: HYMN_THEME_ID,
  defaultBackgroundId: HYMN_BACKGROUND_ID,
  defaultAudioId: null,
  body: hymn.body,
  maxLines: HYMN_MAX_LINES,
  createdAt: timestamp,
  updatedAt: timestamp,
  deleted: false,
  builtIn: true,
  style: HYMN_STYLE,
  music: hymn.music,
  slides: parseManuscriptSlides(hymn.body, { maxLines: HYMN_MAX_LINES }),
});

const STAMP_GAP_MS = 1000;

/**
 * The library sorts newest first, so the hymns are stamped backwards from now:
 * the first title alphabetically is the newest and the last is the oldest. That
 * makes the default sort read A to Z without treating hymns as a special case.
 */
export const seedManuscripts = async (): Promise<Manuscript[]> => {
  const hymns = await loadHymns();
  const newest = Date.parse(now());
  return hymns.map((hymn, index) =>
    buildManuscript(
      hymn,
      new Date(newest - index * STAMP_GAP_MS).toISOString(),
    ),
  );
};
