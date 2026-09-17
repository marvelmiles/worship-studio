import { useCallback } from "react";
import { useStore } from "../../../store/useStore";
import { useGoLive } from "../../../hooks/useGoLive";
import { useGoLiveToast } from "../../../hooks/useGoLiveToast";
import { streamLiveWindow } from "./streamLive";

// window.open must run inside the click, so toggleLive stays synchronous.
export const useStreamGoLive = () => {
  const pushToast = useStore((s) => s.pushToast);
  const { isLive, isExtended, goLive, endLive } = useGoLive(streamLiveWindow);
  const announce = useGoLiveToast("Projection window");

  const toggleLive = useCallback(() => {
    if (isLive) {
      endLive();
      pushToast("Ended the live projection.");
      return;
    }
    announce(goLive(), isExtended);
  }, [announce, endLive, goLive, isExtended, isLive, pushToast]);

  return { isLive, toggleLive };
};
