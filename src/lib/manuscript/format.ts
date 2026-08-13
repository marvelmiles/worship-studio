import type { ManuscriptFormat } from "../../types";
import { DEFAULT_COLLECTION, SERMON_COLLECTION } from "../../data/collections";

/**
 * Collections whose documents are prose rather than lyrics. Sermons are the
 * obvious one; General is where announcements, orders of service and anything
 * else written in sentences land, so it reads the same way.
 */
const PROSE_COLLECTIONS: readonly string[] = [
  SERMON_COLLECTION,
  DEFAULT_COLLECTION,
];

export const MANUSCRIPT_FORMAT_OPTIONS: {
  value: ManuscriptFormat;
  label: string;
}[] = [
  { value: "song", label: "Song (one line per lyric)" },
  { value: "sermon", label: "Sermon (paragraph blocks)" },
];

/** The layout a collection implies before the writer picks one themselves. */
export const defaultFormatForCollection = (
  collection?: string,
): ManuscriptFormat =>
  collection && PROSE_COLLECTIONS.includes(collection) ? "sermon" : "song";

/** The layout to build a manuscript with: its own choice, else its collection's. */
export const resolveManuscriptFormat = (manuscript: {
  format?: ManuscriptFormat;
  collection?: string;
}): ManuscriptFormat =>
  manuscript.format ?? defaultFormatForCollection(manuscript.collection);
