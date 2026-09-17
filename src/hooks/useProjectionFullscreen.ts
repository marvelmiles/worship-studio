import { useCallback, useEffect, useState } from "react";

const OPENER_FULLSCREEN_GRACE_MS = 800;

const isDocumentFullscreen = (): boolean => Boolean(document.fullscreenElement);

const requestDocumentFullscreen = (): void => {
  void document.documentElement.requestFullscreen?.().catch(() => {});
};

interface ProjectionFullscreen {
  isFullscreen: boolean;
  toggle: () => void;
}

export const useProjectionFullscreen = (): ProjectionFullscreen => {
  const [isFullscreen, setIsFullscreen] = useState(isDocumentFullscreen);

  useEffect(() => {
    const onChange = () => setIsFullscreen(isDocumentFullscreen());
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  /* The opener places this window on the projector and asks for fullscreen
     itself; this claims it from inside only if that request was refused,
     because the window still carries the activation from the Go Live click. */
  useEffect(() => {
    if (!window.opener) return;
    const timer = window.setTimeout(() => {
      if (!isDocumentFullscreen()) requestDocumentFullscreen();
    }, OPENER_FULLSCREEN_GRACE_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const toggle = useCallback(() => {
    if (isDocumentFullscreen()) {
      void document.exitFullscreen?.().catch(() => {});
      return;
    }
    requestDocumentFullscreen();
  }, []);

  return { isFullscreen, toggle };
};
