import { useCallback, useEffect, useState } from "react";
import type { RefObject } from "react";

interface FullscreenControls {
  isFullscreen: boolean;
  toggle: () => void;
}

/** Tracks and controls fullscreen for a target element. */
export function useFullscreen(ref: RefObject<HTMLElement>): FullscreenControls {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggle = useCallback(() => {
    try {
      if (document.fullscreenElement) void document.exitFullscreen?.();
      else void ref.current?.requestFullscreen?.();
    } catch {
      /* fullscreen can be blocked by the browser; ignore */
    }
  }, [ref]);

  return { isFullscreen, toggle };
}
