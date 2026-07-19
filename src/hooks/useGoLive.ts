import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  endLive as endLiveWindow,
  getLiveWindowState,
  goLive as openLiveWindow,
  isExtendedDisplay,
  subscribeLiveWindow,
  toggleLiveFullscreen as toggleLiveWindowFullscreen,
  type GoLiveResult,
} from "../lib/liveWindow";

export type { GoLiveResult };

/**
 * React binding over the app-wide live window (see lib/liveWindow.ts). The
 * window itself is owned outside React so that a Present menu can open it
 * inside its own click while the presentation UI, mounted elsewhere, still
 * reflects and controls it.
 */
export function useGoLive() {
  const { isLive, isFullscreen } = useSyncExternalStore(subscribeLiveWindow, getLiveWindowState);
  const [isExtended, setIsExtended] = useState(isExtendedDisplay);

  useEffect(() => {
    const screen = window.screen as unknown as {
      addEventListener?: (type: string, cb: () => void) => void;
      removeEventListener?: (type: string, cb: () => void) => void;
    };
    const onChange = () => setIsExtended(isExtendedDisplay());
    screen.addEventListener?.("change", onChange);
    return () => screen.removeEventListener?.("change", onChange);
  }, []);

  const goLive = useCallback(() => openLiveWindow(), []);
  const endLive = useCallback(() => endLiveWindow(), []);
  const toggleLiveFullscreen = useCallback(() => toggleLiveWindowFullscreen(), []);

  return {
    isExtended,
    isLive,
    isLiveFullscreen: isFullscreen,
    goLive,
    endLive,
    toggleLiveFullscreen,
  };
}
