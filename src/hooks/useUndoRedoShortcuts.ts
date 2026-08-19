import { useEffect, useRef } from "react";

interface UndoRedoShortcutOptions {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  /** Off while something else owns the document, so the keys are left alone. */
  enabled?: boolean;
}

/**
 * Ctrl+Z and Ctrl+Y (Ctrl+Shift+Z too) for the document an editor is holding,
 * whatever has focus inside it: the slide canvas, the title field, a slider in
 * the sidebar or nothing at all.
 *
 * Two things are left alone. A surface that already handled the key marks the
 * event handled, so the text editor's own caret-aware step wins over this one.
 * A dialog owns its keyboard outright, so text typed into one undoes there
 * instead of stepping the document behind it.
 */
export function useUndoRedoShortcuts({
  canUndo,
  canRedo,
  undo,
  redo,
  enabled = true,
}: UndoRedoShortcutOptions): void {
  // Read through a ref so the listener is bound once rather than on every edit.
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
}
