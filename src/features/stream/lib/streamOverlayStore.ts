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

/** Replaces one overlay in place, leaving the paint order untouched. */
function replace(
  id: string,
  map: (overlay: StreamOverlay) => StreamOverlay,
): void {
  let changed = false;
  const next = overlays.map((overlay) => {
    if (overlay.id !== id) return overlay;
    const mapped = map(overlay);
    if (mapped !== overlay) changed = true;
    return mapped;
  });
  if (changed) commit(next);
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
  const removed = overlays.filter((overlay) => overlay.id === id);
  if (removed.length === 0) return;
  const remaining = overlays.filter((overlay) => overlay.id !== id);
  forgetOverlayVideoProgress(id);
  releaseOverlayPassages(removed, remaining);
  commit(remaining);
}

export function clearStreamOverlays(): void {
  if (overlays.length === 0) return;
  for (const overlay of overlays) forgetOverlayVideoProgress(overlay.id);
  releaseOverlayPassages(overlays, []);
  commit([]);
}

/**
 * Applies an operator's edit, staging it if the room is watching.
 *
 * This is the one door every control goes through, which is what makes the
 * promise hold: while an overlay is on air and not auto-syncing, no adjustment
 * — dragging its frame, restyling it, paging to another block — reaches the
 * broadcast until it is applied. Off air there is nothing to protect, so edits
 * land directly and take any earlier staged work with them.
 */
export function editStreamOverlay(id: string, patch: OverlayEdit): void {
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
}

/** Puts everything staged for a live overlay on the broadcast at once. */
export function applyStreamOverlayEdits(id: string): void {
  replace(id, (overlay) =>
    hasStagedEdits(overlay) ? editedOverlay(overlay) : overlay,
  );
}

/** Throws staged work away, snapping back to what the room is looking at. */
export function discardStreamOverlayEdits(id: string): void {
  replace(id, (overlay) =>
    hasStagedEdits(overlay)
      ? ({ ...overlay, pending: null } as StreamOverlay)
      : overlay,
  );
}

/**
 * Turning auto sync on applies whatever was already staged, so the control
 * never leaves the operator looking at edits that have quietly stopped waiting
 * for a button that is no longer there.
 */
export function setStreamOverlayAutoSync(id: string, autoSync: boolean): void {
  replace(id, (overlay) => {
    const synced = autoSync ? editedOverlay(overlay) : overlay;
    return { ...synced, autoSync } as StreamOverlay;
  });
}

/**
 * Patches one overlay directly, bypassing the staging rules. Reserved for the
 * switches that are themselves the broadcast decision — on air, hidden — which
 * would be meaningless if they waited to be applied.
 */
function writeStreamOverlay(id: string, patch: OverlayEdit): void {
  replace(id, (overlay) => ({ ...overlay, ...patch }) as StreamOverlay);
}

/** Applied continuously while dragging, so it clamps rather than validates. */
export function setStreamOverlayFrame(id: string, frame: SlideFrame): void {
  editStreamOverlay(id, { frame: clampFrame(frame) });
}

/**
 * Shows another block or slide of a live element, on the broadcast, now.
 *
 * The one edit that is never staged. Paging through a passage is the same act
 * as pressing next on a projector: the operator is reading with the room, and
 * making them apply each verse would put a second press between every line of
 * scripture. Everything else about the element — where it sits, how it looks,
 * what it is showing — still waits, so this is written directly rather than
 * through the staging door, and any staged page is dropped so the two cannot
 * disagree about which block is up.
 */
export function pageStreamOverlay(id: string, slideIndex: number): void {
  replace(id, (overlay) => {
    const pending = overlay.pending ? { ...overlay.pending } : null;
    if (pending) delete pending.slideIndex;
    return {
      ...overlay,
      slideIndex,
      pending: pending && Object.keys(pending).length > 0 ? pending : null,
    } as StreamOverlay;
  });
}

/** Percent of the broadcast a copy is nudged by, so it doesn't hide its original. */
const DUPLICATE_OFFSET = 3;

export function duplicateStreamOverlay(id: string): void {
  const index = overlays.findIndex((overlay) => overlay.id === id);
  if (index === -1) return;
  // The copy is of what the operator is looking at, staged edits included, and
  // starts life as a draft of its own rather than inheriting the original's air
  // time.
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
}

export function moveStreamOverlay(id: string, direction: number): void {
  const next = reorderOverlays(overlays, id, direction);
  if (next !== overlays) commit(next);
}

/**
 * Taking an overlay off air keeps whatever was staged for it: the operator's
 * surface was already drawing those edits, and nothing is protected once the
 * room has stopped looking at it.
 */
export function setStreamOverlayStatus(
  id: string,
  status: OverlayStatus,
): void {
  replace(id, (overlay) => {
    const settled = status === "draft" ? editedOverlay(overlay) : overlay;
    return { ...settled, status } as StreamOverlay;
  });
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
  if (overlay) writeStreamOverlay(id, { hidden: !overlay.hidden });
}

/** Patches an overlay clip's playback, following the same staging rules. */
export function setStreamOverlayVideo(
  id: string,
  patch: Partial<OverlayVideoPlayback>,
): void {
  const overlay = overlays.find((entry) => entry.id === id);
  if (!overlay || !isVideoOverlay(overlay)) return;
  const current = editedOverlay(overlay) as typeof overlay;
  editStreamOverlay(id, { video: { ...current.video, ...patch } });
}

/**
 * Jumps an overlay clip to a time. The token is what the player watches, so
 * seeking to the position it is already at still moves the picture.
 */
export function seekStreamOverlayVideo(id: string, seekTime: number): void {
  const overlay = overlays.find((entry) => entry.id === id);
  if (!overlay || !isVideoOverlay(overlay)) return;
  const current = editedOverlay(overlay) as typeof overlay;
  setStreamOverlayVideo(id, {
    seekTime,
    seekToken: current.video.seekToken + 1,
  });
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
        ? ({ ...editedOverlay(overlay), status: "draft" } as StreamOverlay)
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
