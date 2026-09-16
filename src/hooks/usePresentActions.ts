import { useCallback } from "react";
import { presentLiveWindow } from "../lib/liveWindow";
import { useStore } from "../store/useStore";

export interface PresentOptions {
  pip: boolean;
}

export interface PresentActions {
  startLive: () => void;
  startPreview: () => void;
}

export const usePresentActions = (
  onPresent: (options: PresentOptions) => void,
): PresentActions => {
  const pushToast = useStore((s) => s.pushToast);

  const startLive = useCallback(() => {
    const result = presentLiveWindow.goLive();
    if (!result.ok && result.reason === "blocked") {
      pushToast(
        "Popup blocked. Allow popups for this site to go live.",
        "error",
      );
      return;
    }
    onPresent({ pip: true });
  }, [onPresent, pushToast]);

  const startPreview = useCallback(
    () => onPresent({ pip: false }),
    [onPresent],
  );

  return { startLive, startPreview };
};
