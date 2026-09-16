import { useEffect, useRef } from "react";
import { clipOwnsSpace } from "../lib/mediaKeys";

const RIVAL_SCOPE_SELECTOR = '[role="dialog"], [data-presenter-pip]';

interface SpacePlayPauseOptions {
  enabled: boolean;
  toggle: () => void;
}

export const useSpacePlayPause = ({
  enabled,
  toggle,
}: SpacePlayPauseOptions): void => {
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
};
