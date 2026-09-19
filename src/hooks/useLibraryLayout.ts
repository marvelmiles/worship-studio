import { useCallback, useState } from "react";

/** How a library page lays its items out: picture-led cards, or detailed rows. */
export type LibraryLayout = "grid" | "list";

export interface LibraryLayoutState {
  layout: LibraryLayout;
  setLayout: (layout: LibraryLayout) => void;
}

const STORAGE_PREFIX = "ws:library-layout:";
const DEFAULT_LAYOUT: LibraryLayout = "grid";

const isLayout = (value: string | null): value is LibraryLayout =>
  value === "grid" || value === "list";

const storageKey = (library: string): string => `${STORAGE_PREFIX}${library}`;

const storedLayout = (library: string): LibraryLayout => {
  try {
    const stored = localStorage.getItem(storageKey(library));
    return isLayout(stored) ? stored : DEFAULT_LAYOUT;
  } catch {
    return DEFAULT_LAYOUT;
  }
};

/** Remembers the choice per library, so each page opens the way it was left. */
export const useLibraryLayout = (library: string): LibraryLayoutState => {
  const [layout, setStateLayout] = useState<LibraryLayout>(() =>
    storedLayout(library),
  );

  const setLayout = useCallback(
    (next: LibraryLayout) => {
      setStateLayout(next);
      try {
        localStorage.setItem(storageKey(library), next);
      } catch {
        /* A blocked store only means the choice does not carry to next time. */
      }
    },
    [library],
  );

  return { layout, setLayout };
};
