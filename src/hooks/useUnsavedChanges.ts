import { useCallback, useEffect } from "react";
import { useBlocker } from "react-router-dom";
import type { BlockerFunction } from "react-router-dom";

export const UNSAVED_CHANGES_MESSAGE =
  "You have unsaved changes. If you leave this page they will be lost.";

export interface UnsavedChangesGuard {
  /** True while a confirmation is waiting on the user. */
  prompting: boolean;
  /** Goes ahead with the held-back navigation, changes and all. */
  discard: () => void;
  /** Drops the held-back navigation and stays put. */
  cancel: () => void;
}

/**
 * Keeps unsaved work from disappearing silently.
 *
 * Everything that moves between screens goes through the router, so a single
 * blocker covers links, the editor's own Back button and the browser's Back and
 * Forward buttons alike: the navigation is held, the caller shows the app's
 * dialog, and `discard`/`cancel` decide it. Closing the tab, reloading it and
 * leaving the site never reach the router, so those stay with the browser's own
 * `beforeunload` dialog.
 */
export function useUnsavedChanges(dirty: boolean): UnsavedChangesGuard {
  const shouldBlock = useCallback<BlockerFunction>(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
    [dirty],
  );
  const blocker = useBlocker(shouldBlock);

  // A held navigation outlives the reason to hold it when the draft stops being
  // dirty (an undo back to the saved text, say). Letting it through keeps the
  // blocker from stranding the user on a screen they asked to leave.
  useEffect(() => {
    if (!dirty && blocker.state === "blocked") blocker.proceed();
  }, [dirty, blocker]);

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

  const discard = useCallback(() => blocker.proceed?.(), [blocker]);
  const cancel = useCallback(() => blocker.reset?.(), [blocker]);

  return { prompting: blocker.state === "blocked", discard, cancel };
}
