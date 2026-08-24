import { useEffect, useRef } from "react";
import { matchEditorCommand, type EditorCommand } from "../lib/shortcuts";

export type EditorCommandHandlers = Partial<
  Record<EditorCommand, (() => void) | undefined>
>;

interface EditorShortcutOptions extends EditorCommandHandlers {
  /** Off while something else owns the document, so the keys are left alone. */
  enabled?: boolean;
}

/**
 * The module editors' own shortcuts: save, push to the running presentation,
 * go live and preview here, whatever has focus inside the editor. They work
 * from the title field and the slide text alike, because the point of them is
 * to save without reaching for the mouse mid-service.
 *
 * Two things are left alone. A surface that already handled the key marks the
 * event handled, and a dialog owns its keyboard outright, so a shortcut typed
 * into one never reaches the document behind it.
 *
 * Ctrl+S swallows the browser's own save dialog even when there is nothing to
 * write: an operator pressing it on a saved document should get nothing at all,
 * not a page-download prompt over their service.
 */
export function useEditorShortcuts({
  enabled = true,
  ...handlers
}: EditorShortcutOptions): void {
  // Read through a ref so the listener is bound once rather than on every edit.
  const state = useRef({ enabled, handlers });
  state.current = { enabled, handlers };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const current = state.current;
      if (!current.enabled || event.defaultPrevented) return;
      const command = matchEditorCommand(event);
      if (!command) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest?.('[role="dialog"]')) return;

      const run = current.handlers[command];
      if (!run && command !== "save") return;
      event.preventDefault();
      run?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
