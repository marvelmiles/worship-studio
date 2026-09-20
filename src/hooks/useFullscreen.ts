import { useCallback, useEffect, useState } from "react";
import type { CSSProperties, RefObject } from "react";

interface FullscreenTarget extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

interface FullscreenDocument extends Document {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
}

export interface FullscreenControls {
  isFullscreen: boolean;
  /**
   * Set while the view fills the viewport by layout instead of through the
   * browser, so the element that asked for it can spread this over its own
   * styles. Null whenever the browser granted real fullscreen.
   */
  fillStyle: CSSProperties | null;
  toggle: () => void;
}

/* Above every panel, dialog and toast, and below the storage gate, which has to
   stay reachable whatever else is on screen. */
const FILL_Z_INDEX = 500;

const FILL_STYLE: CSSProperties = {
  position: "fixed",
  inset: 0,
  width: "100vw",
  height: "100dvh",
  zIndex: FILL_Z_INDEX,
  background: "#000",
};

const fullscreenDocument = (): FullscreenDocument => document;

const activeFullscreenElement = (): Element | null =>
  document.fullscreenElement ??
  fullscreenDocument().webkitFullscreenElement ??
  null;

const requestFullscreen = async (
  element: FullscreenTarget,
): Promise<boolean> => {
  try {
    if (element.requestFullscreen) {
      await element.requestFullscreen();
      return true;
    }
    if (element.webkitRequestFullscreen) {
      await element.webkitRequestFullscreen();
      return true;
    }
  } catch {}
  return false;
};

const leaveFullscreen = (): void => {
  const doc = fullscreenDocument();
  try {
    if (document.exitFullscreen) void document.exitFullscreen().catch(() => {});
    else doc.webkitExitFullscreen?.();
  } catch {}
};

/**
 * Fills the screen with one element. Phone browsers that keep the Fullscreen
 * API for video players alone, iOS Safari among them, refuse the request, so
 * the element fills the viewport itself rather than leaving the button dead.
 */
export const useFullscreen = (
  ref: RefObject<HTMLElement>,
): FullscreenControls => {
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);
  const [isFilling, setIsFilling] = useState(false);

  useEffect(() => {
    const handleChange = () => {
      const active = Boolean(activeFullscreenElement());
      setIsBrowserFullscreen(active);
      if (active) setIsFilling(false);
    };
    document.addEventListener("fullscreenchange", handleChange);
    document.addEventListener("webkitfullscreenchange", handleChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleChange);
      document.removeEventListener("webkitfullscreenchange", handleChange);
    };
  }, []);

  // Nothing behind a filled viewport should scroll while it is covered.
  useEffect(() => {
    if (!isFilling) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [isFilling]);

  const toggle = useCallback(() => {
    if (isFilling) {
      setIsFilling(false);
      return;
    }
    if (activeFullscreenElement()) {
      leaveFullscreen();
      return;
    }
    const element = ref.current as FullscreenTarget | null;
    if (!element) return;
    void requestFullscreen(element).then((granted) => {
      if (!granted) setIsFilling(true);
    });
  }, [isFilling, ref]);

  return {
    isFullscreen: isBrowserFullscreen || isFilling,
    fillStyle: isFilling ? FILL_STYLE : null,
    toggle,
  };
};
