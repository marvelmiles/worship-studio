import { useCallback, useEffect } from "react";
import { useBlocker } from "react-router-dom";
import type { BlockerFunction } from "react-router-dom";

export const UNSAVED_CHANGES_MESSAGE =
  "You have unsaved changes. If you leave this page they will be lost.";

export interface UnsavedChangesGuard {
  prompting: boolean;
  discard: () => void;
  cancel: () => void;
}

export const useUnsavedChanges = (dirty: boolean): UnsavedChangesGuard => {
  const shouldBlock = useCallback<BlockerFunction>(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
    [dirty],
  );
  const blocker = useBlocker(shouldBlock);

  useEffect(() => {
    if (!dirty && blocker.state === "blocked") blocker.proceed();
  }, [dirty, blocker]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = UNSAVED_CHANGES_MESSAGE;
      return UNSAVED_CHANGES_MESSAGE;
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const discard = useCallback(() => blocker.proceed?.(), [blocker]);
  const cancel = useCallback(() => blocker.reset?.(), [blocker]);

  return { prompting: blocker.state === "blocked", discard, cancel };
};
