import { useCallback, useEffect, useState } from "react";
import type { RefObject } from "react";

interface FullscreenControls {
  isFullscreen: boolean;
  toggle: () => void;
}

export const useFullscreen = (
  ref: RefObject<HTMLElement>,
): FullscreenControls => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleChange = () =>
      setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  const toggle = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen?.().catch(() => {});
      return;
    }
    void ref.current?.requestFullscreen?.().catch(() => {});
  }, [ref]);

  return { isFullscreen, toggle };
};
