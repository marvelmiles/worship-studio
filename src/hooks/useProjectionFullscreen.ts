import { useCallback, useEffect, useState } from "react";
import { fullscreenOnExternalScreen } from "../lib/screens";

const isDocumentFullscreen = (): boolean => Boolean(document.fullscreenElement);

interface ProjectionFullscreen {
  isFullscreen: boolean;
  toggle: () => void;
}

/**
 * Fills the projector from inside the live window.
 *
 * This window still carries the click that opened it, which is the one moment
 * it may ask to use another display, so the request goes out as soon as it is
 * on screen. Where the browser takes a display with the request, the picture
 * lands on the projector even when the window itself opened on the laptop.
 */
export const useProjectionFullscreen = (): ProjectionFullscreen => {
  const [isFullscreen, setIsFullscreen] = useState(isDocumentFullscreen);

  useEffect(() => {
    const onChange = () => setIsFullscreen(isDocumentFullscreen());
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    if (!window.opener || isDocumentFullscreen()) return;
    void fullscreenOnExternalScreen(document.documentElement);
  }, []);

  const toggle = useCallback(() => {
    if (isDocumentFullscreen()) {
      void document.exitFullscreen?.().catch(() => {});
      return;
    }
    void fullscreenOnExternalScreen(document.documentElement);
  }, []);

  return { isFullscreen, toggle };
};
