import { useCallback } from "react";
import { useStore } from "../../../store/useStore";
import { useGoLive } from "../../../hooks/useGoLive";
import { useGoLiveToast } from "../../../hooks/useGoLiveToast";
import { streamLiveWindow } from "./streamLive";

export const useStreamGoLive = () => {
  const pushToast = useStore((s) => s.pushToast);
  const { isLive, goLive, endLive } = useGoLive(streamLiveWindow);
  const announce = useGoLiveToast("Projection window");

  const toggleLive = useCallback(() => {
    if (isLive) {
      endLive();
      pushToast("Ended the live projection.");
      return;
    }
    void goLive().then(announce);
  }, [announce, endLive, goLive, isLive, pushToast]);

  return { isLive, toggleLive };
};
