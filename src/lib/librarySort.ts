export type LibrarySortOption =
  "newest" | "oldest" | "modified" | "ascending" | "descending";

export interface LibrarySortChoice {
  value: LibrarySortOption;
  label: string;
}

export const librarySortChoices = (nameLabel: string): LibrarySortChoice[] => [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "modified", label: "Recently modified" },
  { value: "ascending", label: `${nameLabel} A-Z` },
  { value: "descending", label: `${nameLabel} Z-A` },
];

export const DEFAULT_LIBRARY_SORT: LibrarySortOption = "newest";

export interface SortableLibraryItem {
  createdAt: string;
  updatedAt: string;
}

/**
 * Titles that do not open with a letter, such as the elided "’Tis" and "’Mid",
 * sort after the plain A to Z run instead of jumping the queue on punctuation.
 */
const leadingRank = (value: string): number =>
  /^\p{L}/u.test(value.trim()) ? 0 : 1;

export const compareLibraryNames = (a: string, b: string): number =>
  leadingRank(a) - leadingRank(b) ||
  a.localeCompare(b, undefined, { sensitivity: "base", numeric: true });

const compareText = compareLibraryNames;

const compareStamps = (a: string, b: string): number =>
  a < b ? -1 : a > b ? 1 : 0;

export const sortLibrary = <T extends SortableLibraryItem>(
  items: T[],
  option: LibrarySortOption,
  nameOf: (item: T) => string,
): T[] => {
  const settle = (a: T, b: T): number =>
    compareStamps(b.createdAt, a.createdAt) ||
    compareText(nameOf(a), nameOf(b));

  const compare = (a: T, b: T): number => {
    switch (option) {
      case "oldest":
        return compareStamps(a.createdAt, b.createdAt) || settle(a, b);
      case "modified":
        return compareStamps(b.updatedAt, a.updatedAt) || settle(a, b);
      case "ascending":
        return compareText(nameOf(a), nameOf(b)) || settle(a, b);
      case "descending":
        return compareText(nameOf(b), nameOf(a)) || settle(a, b);
      case "newest":
      default:
        return compareStamps(b.createdAt, a.createdAt) || settle(a, b);
    }
  };

  return [...items].sort(compare);
};
