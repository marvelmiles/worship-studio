import { useEffect, useState, useSyncExternalStore } from "react";
import type { SlideFrame } from "../../../types";
import { uid } from "../../../lib/id";
import { clampFrame } from "../../../lib/slideMedia";
import {
  reorderOverlays,
  type ContentOverlay,
  type MarqueeOverlay,
  type OverlayStatus,
  type StreamOverlay,
} from "./streamOverlay";

/**
 * Owns the overlays laid over the live camera, app-wide.
 *
 * A module singleton for the same reason streamSession.ts is one: the overlays
 * have to outlive any particular screen. The operator composes them on the
 * stage, pops the camera out to the floating PiP, walks off to the Bible page to
 * find the next passage, and the broadcast must not change underneath them.
 *
 * Three surfaces in this window read the state directly through
 * useStreamOverlays. The fourth, the projection popup, is a separate window: it
 * cannot share the object, so the state is posted to it over a BroadcastChannel
 * — the same approach the slide presentation uses for its popup, and the reason
 * the overlay model is plain data. The camera itself still travels by reference
 * (see streamLive.ts), because a MediaStream is the one thing that cannot be
 * cloned across a channel.
 */

export const STREAM_OVERLAY_CHANNEL_NAME = "worship-studio-stream-overlays";

export type StreamOverlayMessage =
  | { type: "state"; overlays: StreamOverlay[] }
  /** Sent by a projection window on open, so it doesn't wait for the next edit. */
  | { type: "request-state" };

let overlays: StreamOverlay[] = [];
const listeners = new Set<() => void>();

/**
 * Created lazily and kept open: the operator window both publishes state and
 * answers the popup's request for it. A window with no channel support simply
 * loses the popup mirror, not the in-app overlays.
 */
let channel: BroadcastChannel | null = null;

function ensureChannel(): BroadcastChannel | null {
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
}

function publish(): void {
  try {
    ensureChannel()?.postMessage({ type: "state", overlays });
  } catch {
    /* the popup is gone or the payload is unclonable; in-app overlays stand */
  }
}

function commit(next: StreamOverlay[]): void {
  overlays = next;
  for (const listener of listeners) listener();
  publish();
}

export function subscribeStreamOverlays(listener: () => void): () => void {
  listeners.add(listener);
  ensureChannel();
  return () => listeners.delete(listener);
}

export function getStreamOverlays(): StreamOverlay[] {
  return overlays;
}

/** React binding for every surface in the operator's own window. */
export function useStreamOverlays(): StreamOverlay[] {
  return useSyncExternalStore(subscribeStreamOverlays, getStreamOverlays);
}

export function addStreamOverlay(overlay: StreamOverlay): void {
  commit([...overlays, overlay]);
}

export function removeStreamOverlay(id: string): void {
  commit(overlays.filter((overlay) => overlay.id !== id));
}

export function clearStreamOverlays(): void {
  if (overlays.length === 0) return;
  commit([]);
}

/**
 * Patches one overlay. Typed per variant so a marquee's fields can't be written
 * onto a content overlay, while both still share the common placement fields.
 */
export function updateStreamOverlay(
  id: string,
  patch: Partial<ContentOverlay> | Partial<MarqueeOverlay>,
): void {
  commit(
    overlays.map((overlay) =>
      overlay.id === id ? ({ ...overlay, ...patch } as StreamOverlay) : overlay,
    ),
  );
}

/** Applied continuously while dragging, so it clamps rather than validates. */
export function setStreamOverlayFrame(id: string, frame: SlideFrame): void {
  updateStreamOverlay(id, { frame: clampFrame(frame) });
}

/** Percent of the broadcast a copy is nudged by, so it doesn't hide its original. */
const DUPLICATE_OFFSET = 3;

export function duplicateStreamOverlay(id: string): void {
  const index = overlays.findIndex((overlay) => overlay.id === id);
  if (index === -1) return;
  const original = overlays[index];
  const copy: StreamOverlay = {
    ...original,
    id: uid(),
    frame: clampFrame({
      ...original.frame,
      x: original.frame.x + DUPLICATE_OFFSET,
      y: original.frame.y + DUPLICATE_OFFSET,
    }),
  };
  const next = [...overlays];
  next.splice(index + 1, 0, copy);
  commit(next);
}

export function moveStreamOverlay(id: string, direction: number): void {
  const next = reorderOverlays(overlays, id, direction);
  if (next !== overlays) commit(next);
}

export function setStreamOverlayStatus(
  id: string,
  status: OverlayStatus,
): void {
  updateStreamOverlay(id, { status });
}

/** Puts a draft on air, or takes a live overlay back off it. */
export function toggleStreamOverlayLive(id: string): void {
  const overlay = overlays.find((entry) => entry.id === id);
  if (overlay) {
    setStreamOverlayStatus(id, overlay.status === "live" ? "draft" : "live");
  }
}

/**
 * Draws an element or stops drawing it, leaving its on-air status alone — so
 * unhiding something that was live puts it straight back on the broadcast.
 */
export function toggleStreamOverlayHidden(id: string): void {
  const overlay = overlays.find((entry) => entry.id === id);
  if (overlay) updateStreamOverlay(id, { hidden: !overlay.hidden });
}

/**
 * Clears the broadcast in one action, leaving every overlay staged exactly as
 * it was. This is the panic button: something is on screen that should not be,
 * and the operator needs it gone now rather than one row at a time.
 */
export function takeAllStreamOverlaysOffAir(): void {
  if (!overlays.some((overlay) => overlay.status === "live")) return;
  commit(
    overlays.map((overlay) =>
      overlay.status === "live"
        ? ({ ...overlay, status: "draft" } as StreamOverlay)
        : overlay,
    ),
  );
}

/**
 * Mirrors the operator's overlays into a projection window.
 *
 * Read-only by construction: the popup projects, it never composes. It asks for
 * the current state on mount because it usually opens long after the last edit
 * was broadcast, and a channel delivers nothing to a listener that wasn't there
 * at the time.
 */
export function useMirroredStreamOverlays(): StreamOverlay[] {
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
}
