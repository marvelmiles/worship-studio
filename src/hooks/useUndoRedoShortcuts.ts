import { useEffect, useRef } from "react";

interface UndoRedoShortcutOptions {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  enabled?: boolean;
}

export const useUndoRedoShortcuts = ({
  canUndo,
  canRedo,
  undo,
  redo,
  enabled = true,
}: UndoRedoShortcutOptions): void => {
  const state = useRef({ canUndo, canRedo, undo, redo, enabled });
  state.current = { canUndo, canRedo, undo, redo, enabled };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const current = state.current;
      if (!current.enabled || event.defaultPrevented || event.altKey) return;
      if (!event.ctrlKey && !event.metaKey) return;
      const key = event.key.toLowerCase();
      if (key !== "z" && key !== "y") return;
      const target = event.target as HTMLElement | null;
      if (target?.closest?.('[role="dialog"]')) return;

      const redoing = key === "y" || event.shiftKey;
      if (redoing ? !current.canRedo : !current.canUndo) return;
      event.preventDefault();
      if (redoing) current.redo();
      else current.undo();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
};
