import { useCallback, useEffect, useState } from "react";
import type { RefObject } from "react";

interface GoLiveResult {
  ok: boolean;
  reason?: "no-external" | "unsupported" | "error";
}

/**
 * Detects a second (external/HDMI) display via the Window Management API and
 * projects the presentation onto it in fullscreen. `isExtended` reflects
 * whether the desktop currently spans more than one screen. Browser security
 * requires the projection itself to be triggered by a user gesture.
 */
export function useGoLive(rootRef: RefObject<HTMLElement>) {
  const [isExtended, setIsExtended] = useState<boolean>(() => {
    try {
      return Boolean((window.screen as unknown as { isExtended?: boolean }).isExtended);
    } catch {
      return false;
    }
  });

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

  const goLive = useCallback(async (): Promise<GoLiveResult> => {
    const el = rootRef.current as (HTMLElement & { requestFullscreen: (o?: unknown) => Promise<void> }) | null;
    if (!el) return { ok: false, reason: "error" };

    const getScreenDetails = (window as unknown as { getScreenDetails?: () => Promise<unknown> })
      .getScreenDetails;

    try {
      if (typeof getScreenDetails === "function") {
        const details = (await getScreenDetails()) as {
          screens: { isInternal?: boolean }[];
          currentScreen: unknown;
        };
        const external =
          details.screens.find((s) => s.isInternal === false && s !== details.currentScreen) ||
          details.screens.find((s) => s !== details.currentScreen);
        if (external) {
          await el.requestFullscreen({ screen: external });
          return { ok: true };
        }
        await el.requestFullscreen();
        return { ok: false, reason: "no-external" };
      }
      await el.requestFullscreen();
      return { ok: false, reason: "unsupported" };
    } catch {
      try {
        await el.requestFullscreen();
      } catch {
        /* ignore */
      }
      return { ok: false, reason: "error" };
    }
  }, [rootRef]);

  return { isExtended, goLive };
}
