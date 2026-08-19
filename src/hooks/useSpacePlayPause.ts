import { useEffect, useRef } from "react";

interface SpacePlayPauseOptions {
  /** Off while the surface holds no clip, so the key is left alone. */
  enabled: boolean;
  toggle: () => void;
}

/**
 * Space plays and pauses the clip an editor is holding, the way it does in
 * every other player, whatever has focus on the page.
 *
 * Two things keep it out of the way. A field being typed in owns the space it
 * is given, and so does any control that already answers to space — a button, a
 * checkbox, a select — so tabbing to Save and pressing space still saves rather
 * than starting the video behind it.
 */
export function useSpacePlayPause({
  enabled,
  toggle,
}: SpacePlayPauseOptions): void {
  const state = useRef({ enabled, toggle });
  state.current = { enabled, toggle };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const current = state.current;
      if (!current.enabled || event.defaultPrevented) return;
      if (event.key !== " " && event.key !== "Spacebar") return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        target?.closest?.(
          'input, textarea, select, button, [role="button"], [role="dialog"], [contenteditable="true"]',
        )
      ) {
        return;
      }

      event.preventDefault();
      current.toggle();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
