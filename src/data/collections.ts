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
