import { useCallback } from "react";
import type { GoLiveResult } from "../lib/liveWindow";
import { useStore } from "../store/useStore";

const POPUP_BLOCKED_MESSAGE =
  "Popup blocked. Allow popups for this site to go live.";

/* A browser only hands over another display once the site is allowed to place
   windows, so the first Go Live on a machine can land on this screen. */
const SAME_SCREEN_MESSAGE =
  "Opened on this screen. Allow this site to manage windows when your browser asks, then press Go Live again. You can also drag the window to the other display and press F.";

export type GoLiveAnnouncer = (result: GoLiveResult) => void;

export const useGoLiveToast = (windowLabel: string): GoLiveAnnouncer => {
  const pushToast = useStore((s) => s.pushToast);
  const showGoLiveTip = useStore((s) => s.showGoLiveTip);

  return useCallback(
    (result) => {
      if (!result.ok) {
        if (result.reason === "blocked")
          pushToast(POPUP_BLOCKED_MESSAGE, "error");
        return;
      }
      if (!result.isExtended) {
        pushToast(`${windowLabel} opened in fullscreen.`);
        showGoLiveTip();
        return;
      }
      if (result.placement === "external") {
        pushToast("Live on the external display in fullscreen.");
        showGoLiveTip();
        return;
      }
      pushToast(SAME_SCREEN_MESSAGE, "error");
    },
    [pushToast, showGoLiveTip, windowLabel],
  );
};
