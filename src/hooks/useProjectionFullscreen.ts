import { useCallback, useEffect, useState } from "react";
import { fillProjector } from "../lib/screens";

const isDocumentFullscreen = (): boolean => Boolean(document.fullscreenElement);

interface ProjectionFullscreen {
  isFullscreen: boolean;
  toggle: () => void;
}

/**
 * Fills the projector from inside the live window.
 *
 * This window still carries the click that opened it, which is the one moment
 * a browser will let it ask for the other display, so the request goes out as
 * soon as it is on screen and before anything else can spend that click. Once
 * the display is known the window puts itself on it, so the picture reaches
 * the projector even when the window itself opened on the laptop.
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
    void fillProjector(document.documentElement);
  }, []);

  const toggle = useCallback(() => {
    if (isDocumentFullscreen()) {
      void document.exitFullscreen?.().catch(() => {});
      return;
    }
    void fillProjector(document.documentElement);
  }, []);

  return { isFullscreen, toggle };
};
