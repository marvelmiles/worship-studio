import { useCallback, useEffect, useRef, useState } from "react";

export const UNSAVED_CHANGES_MESSAGE =
  "You have unsaved changes. If you leave this page they will be lost.";

export interface UnsavedChangesGuard {
  /** True while a confirmation is waiting on the user. */
  prompting: boolean;
  /**
   * Runs `action`, or holds it back and asks first while there are unsaved
   * changes. Wrap anything that takes the user off the editor.
   */
  confirm: (action: () => void) => void;
  /** Goes ahead with the held-back action, changes and all. */
  discard: () => void;
  /** Drops the held-back action and stays put. */
  cancel: () => void;
}

/** True for a plain left click the browser would treat as following the link. */
const isPlainClick = (event: MouseEvent): boolean =>
  !event.defaultPrevented &&
  event.button === 0 &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.shiftKey &&
  !event.altKey;

const currentPath = (): string =>
  `${window.location.pathname}${window.location.search}${window.location.hash}`;

/**
 * Keeps unsaved work from disappearing silently.
 *
 * Closing the tab, reloading it and leaving the site go through the browser's
 * own `beforeunload` dialog. A link inside the app never reaches the browser at
 * all, so those clicks are caught here and asked about with the app's own
 * dialog; `confirm` wraps anything else that navigates, such as a Back button.
 */
export function useUnsavedChanges(
  dirty: boolean,
  navigate: (path: string) => void,
): UnsavedChangesGuard {
  const [prompting, setPrompting] = useState(false);
  const pendingRef = useRef<(() => void) | null>(null);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  useEffect(() => {
    if (!dirty) return;
    // Capture phase, so the link is stopped before the router acts on it.
    const onClick = (event: MouseEvent) => {
      if (!isPlainClick(event)) return;
      const target = event.target;
      const anchor =
        target instanceof Element ? target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const url = new URL(anchor.href, window.location.href);
      // Leaving the site entirely is the browser's dialog to show.
      if (url.origin !== window.location.origin) return;
      const path = `${url.pathname}${url.search}${url.hash}`;
      if (path === currentPath()) return;

      event.preventDefault();
      event.stopPropagation();
      pendingRef.current = () => navigateRef.current(path);
      setPrompting(true);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Browsers show their own wording, but a non-empty value is still what
      // opts the dialog in on older engines.
      event.returnValue = UNSAVED_CHANGES_MESSAGE;
      return UNSAVED_CHANGES_MESSAGE;
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const confirm = useCallback((action: () => void) => {
    if (!dirtyRef.current) {
      action();
      return;
    }
    pendingRef.current = action;
    setPrompting(true);
  }, []);

  const discard = useCallback(() => {
    const action = pendingRef.current;
    pendingRef.current = null;
    setPrompting(false);
    action?.();
  }, []);

  const cancel = useCallback(() => {
    pendingRef.current = null;
    setPrompting(false);
  }, []);

  return { prompting, confirm, discard, cancel };
}
