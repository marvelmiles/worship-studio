import { useCallback } from "react";
import { goLive } from "../lib/liveWindow";
import { useStore } from "../store/useStore";

export interface PresentOptions {
  /** Asks for the floating presenter instead of the fullscreen stage. */
  pip: boolean;
}

export interface PresentActions {
  /** Projects to the audience display and leaves the operator in the app. */
  startLive: () => void;
  /** Opens the presentation on this screen only, projecting nothing. */
  startPreview: () => void;
}

/**
 * The two ways of starting a presentation, shared by every control that offers
 * them: the Present menu and the editor keyboard shortcuts alike.
 *
 * Going live opens the projection window inside the caller's own event, because
 * browsers only allow `window.open` during a real user gesture. That is why
 * this cannot be deferred into an effect, and why a blocked popup is reported
 * here rather than left as a presentation that silently never appeared.
 */
export function usePresentActions(
  onPresent: (options: PresentOptions) => void,
): PresentActions {
  const pushToast = useStore((s) => s.pushToast);

  const startLive = useCallback(() => {
    const result = goLive();
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
}
