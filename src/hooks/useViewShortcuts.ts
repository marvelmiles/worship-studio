import { useEffect, useRef } from "react";
import { targetOwnsKey } from "../lib/mediaKeys";
import { matchViewCommand } from "../lib/viewCommands";

interface ViewShortcutOptions {
  /** Left out where a view cannot pop out, such as the projected live window. */
  onTogglePopOut?: () => void;
  /** Left out in a floating window, which has no full screen of its own. */
  onToggleFullscreen?: () => void;
  /** Guards the keys for a view the rest of the app stays usable behind, so a
   *  floating window answers them only while it holds the focus. */
  isArmed?: () => boolean;
}

/** The one place the pop-out and fullscreen keys are bound, so every module
 *  that has both views answers the same two keys. */
export const useViewShortcuts = (options: ViewShortcutOptions): void => {
  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (targetOwnsKey(event)) return;
      const { onTogglePopOut, onToggleFullscreen, isArmed } = latest.current;
      if (isArmed && !isArmed()) return;
      const command = matchViewCommand(event);
      const run =
        command === "popOut"
          ? onTogglePopOut
          : command === "fullscreen"
            ? onToggleFullscreen
            : undefined;
      if (!run) return;
      event.preventDefault();
      run();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
};
