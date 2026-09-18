const NON_SEARCHABLE = /[^\p{L}\p{N}]+/gu;

/**
 * Flattens text to bare words for matching. Hymn lines carry commas, colons and
 * typographic apostrophes, so someone typing an opening line from memory rarely
 * reproduces the punctuation exactly; stripping it from both sides lets the
 * words decide the match.
 */
export const normalizeSearchText = (value: string): string =>
  value.toLowerCase().replace(NON_SEARCHABLE, " ").trim();

/** Builds one haystack from the fields worth searching. */
export const buildSearchIndex = (
  fields: (string | undefined | null)[],
): string => normalizeSearchText(fields.filter(Boolean).join(" "));

export const matchesSearch = (index: string, term: string): boolean => {
  const needle = normalizeSearchText(term);
  return needle ? index.includes(needle) : true;
};
