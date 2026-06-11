import { useEffect } from "react";

/** Sets document.title for the current view and restores it on unmount. */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    const prev = document.title;
    document.title = title;
    return () => {
      document.title = prev;
    };
  }, [title]);
}
