import { useCallback, useSyncExternalStore } from "react";

/**
 * Where each overlay clip has got to, reported by whichever surface is playing
 * it and read by the operator's controls.
 *
 * Playback position is the one thing about an overlay that the operator does
 * not decide: the element carries the intent (playing, muted, seek target) and
 * the video element answers with where it actually is. That answer belongs
 * nowhere near the overlay model, which is posted to the projection window on
 * every change and would otherwise carry a new copy of itself several times a
 * second, so it is kept beside it in this window only.
 *
 * Exactly one surface in this window paints a given overlay at a time — the
 * stage or the floating PiP, never both — so there is one reporter per clip.
 */

export interface OverlayVideoProgress {
  time: number;
  duration: number;
}

const NOT_STARTED: OverlayVideoProgress = { time: 0, duration: 0 };

const progress = new Map<string, OverlayVideoProgress>();
const listeners = new Map<string, Set<() => void>>();

function notify(id: string): void {
  const forId = listeners.get(id);
  if (!forId) return;
  for (const listener of forId) listener();
}

/** Tenths of a second: finer than an operator can read, coarser than the
 *  browser's timeupdate rate, so the controls re-render on real movement. */
const round = (value: number): number =>
  Number.isFinite(value) ? Math.round(value * 10) / 10 : 0;

export function reportOverlayVideoProgress(
  id: string,
  time: number,
  duration: number,
): void {
  const next = { time: round(time), duration: round(duration) };
  const current = progress.get(id);
  if (
    current &&
    current.time === next.time &&
    current.duration === next.duration
  ) {
    return;
  }
  progress.set(id, next);
  notify(id);
}

export function forgetOverlayVideoProgress(id: string): void {
  if (!progress.delete(id)) return;
  notify(id);
}

export function useOverlayVideoProgress(id: string): OverlayVideoProgress {
  const subscribe = useCallback(
    (listener: () => void) => {
      let forId = listeners.get(id);
      if (!forId) {
        forId = new Set();
        listeners.set(id, forId);
      }
      forId.add(listener);
      return () => {
        forId.delete(listener);
        if (forId.size === 0) listeners.delete(id);
      };
    },
    [id],
  );
  // The map holds one object per clip and replaces it only when the numbers
  // move, so the snapshot identity is stable between real updates.
  const snapshot = useCallback(() => progress.get(id) ?? NOT_STARTED, [id]);
  return useSyncExternalStore(subscribe, snapshot);
}
