import { useCallback } from "react";
import { isExtendedDisplay, presentLiveWindow } from "../lib/liveWindow";
import { useGoLiveToast } from "./useGoLiveToast";

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
  const announceGoLive = useGoLiveToast("Presentation window");

  const startLive = useCallback(() => {
    const result = presentLiveWindow.goLive();
    announceGoLive(result, isExtendedDisplay());
    if (!result.ok) return;
    onPresent({ pip: true });
  }, [announceGoLive, onPresent]);

  const startPreview = useCallback(
    () => onPresent({ pip: false }),
    [onPresent],
  );

  return { startLive, startPreview };
};
