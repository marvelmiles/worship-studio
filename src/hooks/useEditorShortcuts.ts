import { useEffect, useRef } from "react";
import { matchEditorCommand, type EditorCommand } from "../lib/shortcuts";

export type EditorCommandHandlers = Partial<
  Record<EditorCommand, (() => void) | undefined>
>;

interface EditorShortcutOptions extends EditorCommandHandlers {
  enabled?: boolean;
}

export const useEditorShortcuts = ({
  enabled = true,
  ...handlers
}: EditorShortcutOptions): void => {
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
};
