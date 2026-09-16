import { useSyncExternalStore } from "react";
import {
  findCamera,
  getStreamSessionState,
  subscribeStreamSession,
} from "./streamSession";

let previewIds: string[] = [];
const listeners = new Set<() => void>();

const emit = (next: string[]): void => {
  previewIds = next;
  for (const listener of listeners) listener();
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = (): string[] => previewIds;

export const useCameraPreviewIds = (): string[] => {
  return useSyncExternalStore(subscribe, getSnapshot);
};

export const isCameraPreviewOpen = (deviceId: string): boolean => {
  return previewIds.includes(deviceId);
};

export const openCameraPreview = (deviceId: string): void => {
  if (previewIds.includes(deviceId)) return;
  emit([...previewIds, deviceId]);
};

export const closeCameraPreview = (deviceId: string): void => {
  if (!previewIds.includes(deviceId)) return;
  emit(previewIds.filter((id) => id !== deviceId));
};

export const toggleCameraPreview = (deviceId: string): void => {
  if (isCameraPreviewOpen(deviceId)) closeCameraPreview(deviceId);
  else openCameraPreview(deviceId);
};

subscribeStreamSession(() => {
  if (previewIds.length === 0) return;
  const session = getStreamSessionState();
  const surviving = previewIds.filter((id) => findCamera(session, id));
  if (surviving.length !== previewIds.length) emit(surviving);
});
