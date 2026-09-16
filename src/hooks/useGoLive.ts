import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  isExtendedDisplay,
  presentLiveWindow,
  type GoLiveResult,
  type LiveWindowController,
} from "../lib/liveWindow";

export type { GoLiveResult };

export const useGoLive = (
  controller: LiveWindowController = presentLiveWindow,
) => {
  const { isLive, isFullscreen } = useSyncExternalStore(
    controller.subscribe,
    controller.getState,
  );
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
  const toggleLiveFullscreen = useCallback(
    () => controller.toggleFullscreen(),
    [controller],
  );

  return {
    isExtended,
    isLive,
    isLiveFullscreen: isFullscreen,
    goLive,
    endLive,
    toggleLiveFullscreen,
  };
};
