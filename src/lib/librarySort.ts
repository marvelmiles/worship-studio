/**
 * Ordering for the library listings (manuscripts, passages, images, videos).
 *
 * The listing order is the operator's to choose and nothing else moves it: the
 * default reads newest-first off `createdAt`, so saving an edit mid-service
 * never reshuffles the grid under the cursor. "Recently modified" is the one
 * option that answers to `updatedAt`, because that is what it was asked for.
 */

export type LibrarySortOption =
  "newest" | "oldest" | "modified" | "ascending" | "descending";

export interface LibrarySortChoice {
  value: LibrarySortOption;
  label: string;
}

export const LIBRARY_SORT_CHOICES: LibrarySortChoice[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "modified", label: "Recently modified" },
  { value: "ascending", label: "Name A to Z" },
  { value: "descending", label: "Name Z to A" },
];

export const DEFAULT_LIBRARY_SORT: LibrarySortOption = "newest";

export interface SortableLibraryItem {
  createdAt: string;
  updatedAt: string;
}

const compareText = (a: string, b: string): number =>
  a.localeCompare(b, undefined, { sensitivity: "base", numeric: true });

const compareStamps = (a: string, b: string): number =>
  a < b ? -1 : a > b ? 1 : 0;

/**
 * Returns a new list in the chosen order. Every comparison falls back to the
 * creation stamp and then the name, so two items sharing a timestamp keep a
 * fixed place instead of swapping between renders.
 */
export function sortLibrary<T extends SortableLibraryItem>(
  items: T[],
  option: LibrarySortOption,
  nameOf: (item: T) => string,
): T[] {
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
}
