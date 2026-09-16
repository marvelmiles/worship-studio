import { useCallback } from "react";
import { useStore } from "../../../store/useStore";
import { useGoLive } from "../../../hooks/useGoLive";
import { streamLiveWindow } from "./streamLive";

// window.open must run inside the click, so toggleLive stays synchronous.
export const useStreamGoLive = () => {
  const pushToast = useStore((s) => s.pushToast);
  const { isLive, isExtended, goLive, endLive } = useGoLive(streamLiveWindow);

  const toggleLive = useCallback(() => {
    if (isLive) {
      endLive();
      pushToast("Ended the live projection.");
      return;
    }
    const result = goLive();
    if (result.ok) {
      pushToast(
        isExtended
          ? "Live on the external display."
          : "Projection window opened. Drag it to your display, then press its fullscreen button.",
      );
    } else if (result.reason === "blocked") {
      pushToast(
        "Popup blocked. Allow popups for this site to go live.",
        "error",
      );
    }
  }, [endLive, goLive, isExtended, isLive, pushToast]);

  return { isLive, toggleLive };
};
