import { useSyncExternalStore } from "react";
import {
  findCamera,
  getStreamSessionState,
  subscribeStreamSession,
} from "./streamSession";

/**
 * Which joined cameras the operator is watching in a floating preview window.
 *
 * A preview is theirs alone: it is not the main screen, not a corner window and
 * never reaches the projection. It answers the question a roster of names
 * cannot, which is "what is that camera actually pointing at right now", and it
 * is what an operator checks before cutting to a device.
 *
 * Held outside React, like the session it follows, so a preview opened from the
 * Stream page survives navigating away from it.
 */

let previewIds: string[] = [];
const listeners = new Set<() => void>();

const emit = (next: string[]): void => {
  previewIds = next;
  for (const listener of listeners) listener();
};

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = (): string[] => previewIds;

/** Device ids being previewed, in the order their windows were opened. */
export function useCameraPreviewIds(): string[] {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function isCameraPreviewOpen(deviceId: string): boolean {
  return previewIds.includes(deviceId);
}

export function openCameraPreview(deviceId: string): void {
  if (previewIds.includes(deviceId)) return;
  emit([...previewIds, deviceId]);
}

export function closeCameraPreview(deviceId: string): void {
  if (!previewIds.includes(deviceId)) return;
  emit(previewIds.filter((id) => id !== deviceId));
}

export function toggleCameraPreview(deviceId: string): void {
  if (isCameraPreviewOpen(deviceId)) closeCameraPreview(deviceId);
  else openCameraPreview(deviceId);
}

// A preview belongs to a connection. When the device leaves, or the session
// ends, its window goes with it rather than lingering over a dead stream.
subscribeStreamSession(() => {
  if (previewIds.length === 0) return;
  const session = getStreamSessionState();
  const surviving = previewIds.filter((id) => findCamera(session, id));
  if (surviving.length !== previewIds.length) emit(surviving);
});
