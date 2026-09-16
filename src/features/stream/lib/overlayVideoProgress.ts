import { useCallback, useSyncExternalStore } from "react";

export interface OverlayVideoProgress {
  time: number;
  duration: number;
}

const NOT_STARTED: OverlayVideoProgress = { time: 0, duration: 0 };

const progress = new Map<string, OverlayVideoProgress>();
const listeners = new Map<string, Set<() => void>>();

const notify = (id: string): void => {
  const forId = listeners.get(id);
  if (!forId) return;
  for (const listener of forId) listener();
};

const round = (value: number): number =>
  Number.isFinite(value) ? Math.round(value * 10) / 10 : 0;

export const reportOverlayVideoProgress = (
  id: string,
  time: number,
  duration: number,
): void => {
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
};

export const forgetOverlayVideoProgress = (id: string): void => {
  if (!progress.delete(id)) return;
  notify(id);
};

export const useOverlayVideoProgress = (id: string): OverlayVideoProgress => {
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
  const snapshot = useCallback(() => progress.get(id) ?? NOT_STARTED, [id]);
  return useSyncExternalStore(subscribe, snapshot);
};
