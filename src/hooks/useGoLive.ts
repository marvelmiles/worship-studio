import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  isExtendedDisplay,
  presentLiveWindow,
  type GoLiveResult,
  type LiveWindowController,
} from "../lib/liveWindow";

export type { GoLiveResult };

/**
 * React binding over an app-wide live window (see lib/liveWindow.ts). The
 * window itself is owned outside React so a Present/Go-Live control can open it
 * inside its own click while the UI, mounted elsewhere, still reflects and
 * controls it.
 *
 * Defaults to the slide-presentation output; pass another controller (e.g. the
 * camera stream's) to drive a different projected window with the same binding.
 */
export function useGoLive(controller: LiveWindowController = presentLiveWindow) {
  const { isLive, isFullscreen } = useSyncExternalStore(controller.subscribe, controller.getState);
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

  const goLive = useCallback(() => controller.goLive(), [controller]);
  const endLive = useCallback(() => controller.endLive(), [controller]);
  const toggleLiveFullscreen = useCallback(() => controller.toggleFullscreen(), [controller]);

  return {
    isExtended,
    isLive,
    isLiveFullscreen: isFullscreen,
    goLive,
    endLive,
    toggleLiveFullscreen,
  };
}
