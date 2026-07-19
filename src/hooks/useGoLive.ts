import { useCallback, useEffect, useRef, useState } from "react";
import { PRESENT_WINDOW_NAME } from "../lib/presentChannel";

interface GoLiveResult {
  ok: boolean;
  reason?: "no-external" | "unsupported" | "blocked" | "error";
}

interface ScreenDetailed {
  left: number;
  top: number;
  width: number;
  height: number;
  isPrimary?: boolean;
  isInternal?: boolean;
}

interface ScreenDetails {
  screens: ScreenDetailed[];
  currentScreen: ScreenDetailed;
}

/**
 * Opens the presentation as a separate, positioned browser window on the
 * external/HDMI display (via the Window Management API) so the operator can
 * keep working in the main window while the audience only sees the popup.
 * Falls back to an unpositioned popup window when multi-screen placement
 * isn't supported, and the caller is expected to size/move it manually.
 */
export function useGoLive() {
  const [isExtended, setIsExtended] = useState<boolean>(() => {
    try {
      return Boolean(
        (window.screen as unknown as { isExtended?: boolean }).isExtended,
      );
    } catch {
      return false;
    }
  });
  const winRef = useRef<Window | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [isLiveFullscreen, setIsLiveFullscreen] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const externalBoundsRef = useRef<{ left: number; top: number; width: number; height: number } | null>(null);
  const closeWatcher = useRef<number>();

  useEffect(() => {
    const screen = window.screen as unknown as {
      isExtended?: boolean;
      addEventListener?: (type: string, cb: () => void) => void;
      removeEventListener?: (type: string, cb: () => void) => void;
    };
    const onChange = () => setIsExtended(Boolean(screen.isExtended));
    screen.addEventListener?.("change", onChange);
    return () => screen.removeEventListener?.("change", onChange);
  }, []);

  const stopWatchingClose = () => {
    window.clearInterval(closeWatcher.current);
    closeWatcher.current = undefined;
  };

  const endLive = useCallback(() => {
    stopWatchingClose();
    try {
      winRef.current?.close();
    } catch {
      /* window may already be gone */
    }
    winRef.current = null;
    setIsLive(false);
    setIsLiveFullscreen(false);
    setIsRevealed(false);
    externalBoundsRef.current = null;
  }, []);

  useEffect(() => endLive, [endLive]);

  /** Pulls the live popup onto the operator's own screen so it can be seen and clicked. */
  const revealLiveWindow = useCallback(() => {
    const win = winRef.current;
    if (!win || win.closed) return;
    try {
      if (win.document.fullscreenElement) void win.document.exitFullscreen();
      win.moveTo(Math.max(0, window.screenX + 60), Math.max(0, window.screenY + 60));
      win.resizeTo(720, 405);
      win.focus();
      setIsRevealed(true);
    } catch {
      /* cross-origin or window gone; ignore */
    }
  }, []);

  /** Sends the popup back to cover the external screen and re-enters fullscreen. */
  const sendLiveWindowToDisplay = useCallback(() => {
    const win = winRef.current;
    const bounds = externalBoundsRef.current;
    if (!win || win.closed) return;
    try {
      if (bounds) {
        win.moveTo(bounds.left, bounds.top);
        win.resizeTo(bounds.width, bounds.height);
        void win.document.documentElement.requestFullscreen?.().catch(() => {});
      }
      setIsRevealed(false);
    } catch {
      /* cross-origin or window gone; ignore */
    }
  }, []);

  /**
   * Entering fullscreen on the popup needs a user gesture the browser may no
   * longer honor, so this can resolve false. Callers should then point the
   * user at the fullscreen button inside the popup, where a real click works.
   */
  const toggleLiveFullscreen = useCallback(async (): Promise<boolean> => {
    const win = winRef.current;
    if (!win || win.closed) return false;
    try {
      if (win.document.fullscreenElement) {
        await win.document.exitFullscreen();
      } else {
        await win.document.documentElement.requestFullscreen();
      }
      return true;
    } catch {
      return false;
    }
  }, []);

  const goLive = useCallback(async (): Promise<GoLiveResult> => {
    if (winRef.current && !winRef.current.closed) {
      endLive();
      return { ok: true };
    }

    const getScreenDetails = (
      window as unknown as { getScreenDetails?: () => Promise<ScreenDetails> }
    ).getScreenDetails;

    let left: number | undefined;
    let top: number | undefined;
    let width: number | undefined;
    let height: number | undefined;
    let reason: GoLiveResult["reason"] = "unsupported";

    try {
      if (typeof getScreenDetails === "function") {
        const details = await getScreenDetails();
        const external =
          details.screens.find(
            (s) => s.isInternal === false && s !== details.currentScreen,
          ) || details.screens.find((s) => s !== details.currentScreen);
        if (external) {
          left = external.left;
          top = external.top;
          width = external.width;
          height = external.height;
          externalBoundsRef.current = { left, top, width, height };
          reason = undefined;
        } else {
          reason = "no-external";
        }
      }
    } catch {
      reason = "error";
    }

    const features = [
      `left=${left ?? window.screen.width}`,
      `top=${top ?? 0}`,
      `width=${width ?? 1280}`,
      `height=${height ?? 720}`,
      "toolbar=no",
      "location=no",
      "menubar=no",
      "status=no",
      "scrollbars=no",
      "resizable=yes",
    ].join(",");

    const win = window.open("/present", PRESENT_WINDOW_NAME, features);
    if (!win) return { ok: false, reason: "blocked" };

    winRef.current = win;
    setIsLive(true);

    win.addEventListener("load", () => {
      try {
        if (left !== undefined) {
          win.moveTo(left!, top!);
          win.resizeTo(width!, height!);
        }
        win.document.addEventListener("fullscreenchange", () => {
          setIsLiveFullscreen(Boolean(win.document.fullscreenElement));
        });
        setIsLiveFullscreen(Boolean(win.document.fullscreenElement));
        // Auto-fullscreen only works right after window.open(), while the
        // browser still honors the delegated user gesture.
        if (left !== undefined) {
          void win.document.documentElement.requestFullscreen?.().catch(() => {});
        }
      } catch {
        /* cross-origin or already positioned; ignore */
      }
    });

    closeWatcher.current = window.setInterval(() => {
      if (winRef.current?.closed) {
        winRef.current = null;
        setIsLive(false);
        setIsLiveFullscreen(false);
        setIsRevealed(false);
        externalBoundsRef.current = null;
        stopWatchingClose();
      }
    }, 800);

    return { ok: reason === undefined, reason };
  }, [endLive]);

  return {
    isExtended,
    isLive,
    isLiveFullscreen,
    isRevealed,
    goLive,
    endLive,
    toggleLiveFullscreen,
    revealLiveWindow,
    sendLiveWindowToDisplay,
    liveWindow: winRef,
  };
}
