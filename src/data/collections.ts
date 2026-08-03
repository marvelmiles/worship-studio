/**
 * Collections group manuscripts in the library. The studio started with songs
 * only, so most of these are musical; "Sermons" and "General" cover the rest of
 * what a service needs, from Sunday messages to announcement decks.
 */
export const COLLECTIONS = [
  "Worship",
  "Praise",
  "Hymns",
  "Special Songs",
  "Choir Ministration",
  "Sermons",
  "General",
] as const;

export type Collection = (typeof COLLECTIONS)[number];

export const DEFAULT_COLLECTION: Collection = "General";

export const SERMON_COLLECTION: Collection = "Sermons";

export const isCollection = (value: string): value is Collection =>
  (COLLECTIONS as readonly string[]).includes(value);
