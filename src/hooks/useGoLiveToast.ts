import { useCallback } from "react";
import type { GoLiveResult } from "../lib/liveWindow";
import { useStore } from "../store/useStore";

const POPUP_BLOCKED_MESSAGE =
  "Popup blocked. Allow popups for this site to go live.";

export type GoLiveAnnouncer = (
  result: GoLiveResult,
  isExtended: boolean,
) => void;

export const useGoLiveToast = (windowLabel: string): GoLiveAnnouncer => {
  const pushToast = useStore((s) => s.pushToast);
  const showGoLiveTip = useStore((s) => s.showGoLiveTip);

  return useCallback(
    (result, isExtended) => {
      if (!result.ok) {
        if (result.reason === "blocked")
          pushToast(POPUP_BLOCKED_MESSAGE, "error");
        return;
      }
      pushToast(
        isExtended
          ? "Live on the external display in fullscreen."
          : `${windowLabel} opened in fullscreen.`,
      );
      showGoLiveTip();
    },
    [pushToast, showGoLiveTip, windowLabel],
  );
};
