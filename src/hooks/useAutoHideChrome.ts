import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

/** How long the chrome stays up after the pointer last moved. */
const DEFAULT_DELAY_MS = 2800;

export interface AutoHideChromeOptions {
  /** Off while nothing is playing, which pins the chrome open. */
  enabled?: boolean;
  delayMs?: number;
  /**
   * The surface the pointer is watched on. Left out, the whole window is: a
   * fullscreen stage has no edge to leave, and the clip's own element is
   * portalled outside the React tree, so a listener on the page is the only one
   * a pointer moving over the video reaches.
   */
  surfaceRef?: RefObject<HTMLElement | null>;
}

export interface AutoHideChrome {
  /** True while the controls should be on screen. */
  visible: boolean;
  /** Shows the controls and starts the countdown again. */
  wake: () => void;
  /** Holds the controls open while the pointer rests on one of them. */
  onHoverChange: (hovering: boolean) => void;
}

/**
 * Player chrome that shows itself when the pointer moves and steps out of the
 * way once it stops, so a clip is watched rather than the controls over it.
 *
 * Hovering a control pins it open for as long as the pointer stays there, which
 * is what keeps a volume slider from vanishing halfway through being dragged.
 */
export function useAutoHideChrome({
  enabled = true,
  delayMs = DEFAULT_DELAY_MS,
  surfaceRef,
}: AutoHideChromeOptions = {}): AutoHideChrome {
  const [awake, setAwake] = useState(true);
  const timer = useRef<number>();
  const hovering = useRef(false);

  // Turning the countdown on or off starts the chrome from open, so coming back
  // to a surface never lands on controls that are already gone.
  const [wasEnabled, setWasEnabled] = useState(enabled);
  if (enabled !== wasEnabled) {
    setWasEnabled(enabled);
    setAwake(true);
  }

  const scheduleHide = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (!hovering.current) setAwake(false);
    }, delayMs);
  }, [delayMs]);

  const wake = useCallback(() => {
    setAwake(true);
    scheduleHide();
  }, [scheduleHide]);

  const onHoverChange = useCallback(
    (isHovering: boolean) => {
      hovering.current = isHovering;
      if (isHovering) {
        setAwake(true);
        window.clearTimeout(timer.current);
        return;
      }
      scheduleHide();
    },
    [scheduleHide],
  );

  useEffect(() => {
    if (!enabled) return;
    const surface: HTMLElement | Window = surfaceRef?.current ?? window;
    const onMove = () => wake();
    // Leaving a bounded surface hides the controls at once: the pointer is
    // somewhere else on the page and the clip is no longer being worked on.
    const onLeave = () => {
      window.clearTimeout(timer.current);
      if (!hovering.current) setAwake(false);
    };
    surface.addEventListener("pointermove", onMove);
    if (surfaceRef) surface.addEventListener("pointerleave", onLeave);
    scheduleHide();
    return () => {
      surface.removeEventListener("pointermove", onMove);
      if (surfaceRef) surface.removeEventListener("pointerleave", onLeave);
      window.clearTimeout(timer.current);
    };
  }, [enabled, surfaceRef, wake, scheduleHide]);

  return { visible: !enabled || awake, wake, onHoverChange };
}
