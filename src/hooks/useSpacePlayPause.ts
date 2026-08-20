import { useEffect, useRef } from "react";
import { clipOwnsSpace } from "../lib/mediaKeys";

/** Regions that run a presentation of their own, whose keys are not this one's. */
const RIVAL_SCOPE_SELECTOR = '[role="dialog"], [data-presenter-pip]';

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
 * is given, and so does any control that already answers to space, so tabbing to
 * Save and pressing space still saves rather than starting the video behind it.
 * That second rule is lifted inside the player's own box (see lib/mediaKeys.ts),
 * where the clip is what the key is reached for.
 *
 * A dialog and the floating presenter are left alone outright: while either is
 * up the key belongs to what it is driving, and the editor's own preview waits
 * until focus comes back to the page.
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
      if (!clipOwnsSpace(event)) return;
      if (
        event.target instanceof HTMLElement &&
        event.target.closest(RIVAL_SCOPE_SELECTOR)
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
