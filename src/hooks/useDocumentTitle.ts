import { useEffect } from "react";
import { documentTitle } from "../lib/appInfo";

/** Names the browser tab after the page, under the app's own name. */
export const useDocumentTitle = (page: string): void => {
  useEffect(() => {
    const previous = document.title;
    document.title = documentTitle(page);
    return () => {
      document.title = previous;
    };
  }, [page]);
};
