import { useCallback } from "react";
import type { GoLiveResult } from "../lib/liveWindow";
import { useStore } from "../store/useStore";

const POPUP_BLOCKED_MESSAGE =
  "Popup blocked. Allow popups for this site to go live.";

/* The live window asks for the other display as it loads, so the first Go
   Live on a machine ends with a browser prompt rather than a picture. */
const PENDING_MESSAGE =
  "Sending the live window to the other display. Choose Allow if your browser asks to manage windows, and it moves across on its own.";

const DENIED_MESSAGE =
  "This site is blocked from using the other display. Turn on Window management for it in your browser's site settings, then press Go Live again. You can also drag the live window onto the other display and press F.";

const SAME_SCREEN_MESSAGE =
  "Opened on this screen. Drag the live window onto the other display and press F to fill it.";

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
      if (result.placement === "pending") {
        pushToast(PENDING_MESSAGE);
        showGoLiveTip();
        return;
      }
      pushToast(
        result.access === "denied" ? DENIED_MESSAGE : SAME_SCREEN_MESSAGE,
        "error",
      );
    },
    [pushToast, showGoLiveTip, windowLabel],
  );
};
