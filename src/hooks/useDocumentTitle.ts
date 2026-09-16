import { useEffect } from "react";

export const useDocumentTitle = (title: string): void => {
  useEffect(() => {
    const prev = document.title;
    document.title = title;
    return () => {
      document.title = prev;
    };
  }, [title]);
};
