import { useEffect, useState, useSyncExternalStore } from "react";
import type { SlideFrame } from "../../../types";
import { uid } from "../../../lib/id";
import { clampFrame } from "../../../lib/slideMedia";
import { forgetOverlayVideoProgress } from "./overlayVideoProgress";
import { releaseOverlayPassages } from "./overlayPassage";
import {
  editedOverlay,
  hasStagedEdits,
  isVideoOverlay,
  reorderOverlays,
  type OverlayEdit,
  type OverlayStatus,
  type OverlayVideoPlayback,
  type StreamOverlay,
} from "./streamOverlay";

export const STREAM_OVERLAY_CHANNEL_NAME = "worship-studio-stream-overlays";

export type StreamOverlayMessage =
  { type: "state"; overlays: StreamOverlay[] } | { type: "request-state" };

let overlays: StreamOverlay[] = [];
const listeners = new Set<() => void>();

let channel: BroadcastChannel | null = null;

const ensureChannel = (): BroadcastChannel | null => {
  if (channel || typeof BroadcastChannel === "undefined") return channel;
  try {
    channel = new BroadcastChannel(STREAM_OVERLAY_CHANNEL_NAME);
    channel.onmessage = (event: MessageEvent<StreamOverlayMessage>) => {
      if (event.data?.type === "request-state") publish();
    };
  } catch {
    channel = null;
  }
  return channel;
};

const publish = (): void => {
  try {
    ensureChannel()?.postMessage({ type: "state", overlays });
  } catch {}
};

const commit = (next: StreamOverlay[]): void => {
  overlays = next;
  for (const listener of listeners) listener();
  publish();
};

const replace = (
  id: string,
  map: (overlay: StreamOverlay) => StreamOverlay,
): void => {
  let changed = false;
  const next = overlays.map((overlay) => {
    if (overlay.id !== id) return overlay;
    const mapped = map(overlay);
    if (mapped !== overlay) changed = true;
    return mapped;
  });
  if (changed) commit(next);
};

let selectedId: string | null = null;

export const getSelectedStreamOverlayId = (): string | null => {
  return selectedId;
};

export const selectStreamOverlay = (id: string | null): void => {
  if (selectedId === id) return;
  selectedId = id;
  for (const listener of listeners) listener();
};

export const useSelectedStreamOverlayId = (): string | null => {
  return useSyncExternalStore(
    subscribeStreamOverlays,
    getSelectedStreamOverlayId,
  );
};

export const subscribeStreamOverlays = (listener: () => void): (() => void) => {
  listeners.add(listener);
  ensureChannel();
  return () => listeners.delete(listener);
};

export const getStreamOverlays = (): StreamOverlay[] => {
  return overlays;
};

export const useStreamOverlays = (): StreamOverlay[] => {
  return useSyncExternalStore(subscribeStreamOverlays, getStreamOverlays);
};

export const addStreamOverlay = (overlay: StreamOverlay): void => {
  commit([...overlays, overlay]);
};

export const removeStreamOverlay = (id: string): void => {
  const removed = overlays.filter((overlay) => overlay.id === id);
  if (removed.length === 0) return;
  const remaining = overlays.filter((overlay) => overlay.id !== id);
  forgetOverlayVideoProgress(id);
  releaseOverlayPassages(removed, remaining);
  if (selectedId === id) selectedId = null;
  commit(remaining);
};

export const clearStreamOverlays = (): void => {
  selectedId = null;
  if (overlays.length === 0) return;
  for (const overlay of overlays) forgetOverlayVideoProgress(overlay.id);
  releaseOverlayPassages(overlays, []);
  commit([]);
};

export const editStreamOverlay = (id: string, patch: OverlayEdit): void => {
  replace(id, (overlay) => {
    if (overlay.status === "live" && !overlay.autoSync) {
      return {
        ...overlay,
        pending: { ...(overlay.pending ?? {}), ...patch },
      } as StreamOverlay;
    }
    return {
      ...overlay,
      ...(overlay.pending ?? {}),
      ...patch,
      pending: null,
    } as StreamOverlay;
  });
};

export const applyStreamOverlayEdits = (id: string): void => {
  replace(id, (overlay) =>
    hasStagedEdits(overlay) ? editedOverlay(overlay) : overlay,
  );
};

export const discardStreamOverlayEdits = (id: string): void => {
  replace(id, (overlay) =>
    hasStagedEdits(overlay)
      ? ({ ...overlay, pending: null } as StreamOverlay)
      : overlay,
  );
};

export const setStreamOverlayAutoSync = (
  id: string,
  autoSync: boolean,
): void => {
  replace(id, (overlay) => {
    const synced = autoSync ? editedOverlay(overlay) : overlay;
    return { ...synced, autoSync } as StreamOverlay;
  });
};

const writeStreamOverlay = (id: string, patch: OverlayEdit): void => {
  replace(id, (overlay) => ({ ...overlay, ...patch }) as StreamOverlay);
};

export const setStreamOverlayFrame = (id: string, frame: SlideFrame): void => {
  editStreamOverlay(id, { frame: clampFrame(frame) });
};

export const pageStreamOverlay = (id: string, slideIndex: number): void => {
  replace(id, (overlay) => {
    const pending = overlay.pending ? { ...overlay.pending } : null;
    if (pending) delete pending.slideIndex;
    return {
      ...overlay,
      slideIndex,
      pending: pending && Object.keys(pending).length > 0 ? pending : null,
    } as StreamOverlay;
  });
};

const DUPLICATE_OFFSET = 3;

export const duplicateStreamOverlay = (id: string): void => {
  const index = overlays.findIndex((overlay) => overlay.id === id);
  if (index === -1) return;
  const original = editedOverlay(overlays[index]);
  const copy: StreamOverlay = {
    ...original,
    id: uid(),
    status: "draft",
    pending: null,
    frame: clampFrame({
      ...original.frame,
      x: original.frame.x + DUPLICATE_OFFSET,
      y: original.frame.y + DUPLICATE_OFFSET,
    }),
  };
  const next = [...overlays];
  next.splice(index + 1, 0, copy);
  commit(next);
};

export const moveStreamOverlay = (id: string, direction: number): void => {
  const next = reorderOverlays(overlays, id, direction);
  if (next !== overlays) commit(next);
};

export const setStreamOverlayStatus = (
  id: string,
  status: OverlayStatus,
): void => {
  replace(id, (overlay) => {
    const settled = status === "draft" ? editedOverlay(overlay) : overlay;
    return { ...settled, status } as StreamOverlay;
  });
};

export const toggleStreamOverlayLive = (id: string): void => {
  const overlay = overlays.find((entry) => entry.id === id);
  if (overlay) {
    setStreamOverlayStatus(id, overlay.status === "live" ? "draft" : "live");
  }
};

export const toggleStreamOverlayHidden = (id: string): void => {
  const overlay = overlays.find((entry) => entry.id === id);
  if (overlay) writeStreamOverlay(id, { hidden: !overlay.hidden });
};

export const setStreamOverlayVideo = (
  id: string,
  patch: Partial<OverlayVideoPlayback>,
): void => {
  const overlay = overlays.find((entry) => entry.id === id);
  if (!overlay || !isVideoOverlay(overlay)) return;
  const current = editedOverlay(overlay) as typeof overlay;
  editStreamOverlay(id, { video: { ...current.video, ...patch } });
};

export const seekStreamOverlayVideo = (id: string, seekTime: number): void => {
  const overlay = overlays.find((entry) => entry.id === id);
  if (!overlay || !isVideoOverlay(overlay)) return;
  const current = editedOverlay(overlay) as typeof overlay;
  setStreamOverlayVideo(id, {
    seekTime,
    seekToken: current.video.seekToken + 1,
  });
};

export const takeAllStreamOverlaysOffAir = (): void => {
  if (!overlays.some((overlay) => overlay.status === "live")) return;
  commit(
    overlays.map((overlay) =>
      overlay.status === "live"
        ? ({ ...editedOverlay(overlay), status: "draft" } as StreamOverlay)
        : overlay,
    ),
  );
};

export const useMirroredStreamOverlays = (): StreamOverlay[] => {
  const [mirrored, setMirrored] = useState<StreamOverlay[]>([]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    let live: BroadcastChannel;
    try {
      live = new BroadcastChannel(STREAM_OVERLAY_CHANNEL_NAME);
    } catch {
      return;
    }
    live.onmessage = (event: MessageEvent<StreamOverlayMessage>) => {
      if (event.data?.type === "state") setMirrored(event.data.overlays);
    };
    live.postMessage({ type: "request-state" });
    return () => live.close();
  }, []);

  return mirrored;
};
