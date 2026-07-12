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
  }, []);

  useEffect(() => endLive, [endLive]);

  const toggleLiveFullscreen = useCallback(() => {
    const win = winRef.current;
    if (!win || win.closed) return;
    try {
      if (win.document.fullscreenElement) void win.document.exitFullscreen();
      else void win.document.documentElement.requestFullscreen();
    } catch {
      /* the popup may not have transient activation of its own; ignore */
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
        // Only auto-enters fullscreen when we could place the popup on its
        // own screen — this call relies on activation delegated from the
        // window.open() that just created it, which is spent after this.
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
        stopWatchingClose();
      }
    }, 800);

    return { ok: reason === undefined, reason };
  }, [endLive]);

  return { isExtended, isLive, isLiveFullscreen, goLive, endLive, toggleLiveFullscreen, liveWindow: winRef };
}
