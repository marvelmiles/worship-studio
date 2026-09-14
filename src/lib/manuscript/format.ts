import type { ManuscriptFormat } from "../../types";
import { SERMON_COLLECTION } from "../../data/collections";

/** The layout a manuscript is built with until the writer picks another. */
export const DEFAULT_MANUSCRIPT_FORMAT: ManuscriptFormat = "song";

/**
 * Collections whose documents are prose rather than lyrics. Everything else,
 * General included, is read one lyric per line until the writer says otherwise.
 */
const PROSE_COLLECTIONS: readonly string[] = [SERMON_COLLECTION];

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
  collection && PROSE_COLLECTIONS.includes(collection)
    ? "sermon"
    : DEFAULT_MANUSCRIPT_FORMAT;

/** The layout to build a manuscript with: its own choice, else its collection's. */
export const resolveManuscriptFormat = (manuscript: {
  format?: ManuscriptFormat;
  collection?: string;
}): ManuscriptFormat =>
  manuscript.format ?? defaultFormatForCollection(manuscript.collection);
