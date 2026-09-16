import { useEffect } from "react";

interface ScreenWakeLockSentinel {
  released: boolean;
  release: () => Promise<void>;
}

interface ScreenWakeLockApi {
  request: (type: "screen") => Promise<ScreenWakeLockSentinel>;
}

const getWakeLockApi = (): ScreenWakeLockApi | null =>
  (navigator as Navigator & { wakeLock?: ScreenWakeLockApi }).wakeLock ?? null;

// The browser drops the lock whenever the page is hidden, so it is re-requested each time the page is visible again.
export const useScreenWakeLock = (isEnabled: boolean): void => {
  useEffect(() => {
    const wakeLockApi = getWakeLockApi();
    if (!isEnabled || !wakeLockApi) return;

    let sentinel: ScreenWakeLockSentinel | null = null;
    let isDisposed = false;

    const acquire = async () => {
      if (document.visibilityState !== "visible") return;
      if (sentinel && !sentinel.released) return;
      try {
        const nextSentinel = await wakeLockApi.request("screen");
        if (isDisposed) void nextSentinel.release();
        else sentinel = nextSentinel;
      } catch {
        sentinel = null;
      }
    };

    const handleVisibilityChange = () => void acquire();

    void acquire();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      isDisposed = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void sentinel?.release().catch(() => {});
    };
  }, [isEnabled]);
};
