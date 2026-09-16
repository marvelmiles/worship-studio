import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

const DEFAULT_DELAY_MS = 2800;

export interface AutoHideChromeOptions {
  enabled?: boolean;
  delayMs?: number;
  surfaceRef?: RefObject<HTMLElement | null>;
}

export interface AutoHideChrome {
  visible: boolean;
  wake: () => void;
  onHoverChange: (hovering: boolean) => void;
}

export const useAutoHideChrome = ({
  enabled = true,
  delayMs = DEFAULT_DELAY_MS,
  surfaceRef,
}: AutoHideChromeOptions = {}): AutoHideChrome => {
  const [awake, setAwake] = useState(true);
  const timer = useRef<number>();
  const hovering = useRef(false);

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
};
