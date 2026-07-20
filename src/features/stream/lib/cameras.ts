/**
 * Camera enumeration helpers for the sender. A device with both a front and a
 * back camera exposes them as two separate video inputs, so switching is just a
 * matter of moving to the next input by its id — which works the same on a
 * phone (front/back) and a laptop (built-in/USB).
 */

export async function listCameras(): Promise<MediaDeviceInfo[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === "videoinput");
  } catch {
    return [];
  }
}

/** The next camera id after the current one, cycling round, or null if there's only one. */
export function nextCameraId(cameras: MediaDeviceInfo[], currentId?: string): string | null {
  if (cameras.length < 2) return null;
  const index = cameras.findIndex((c) => c.deviceId === currentId);
  return cameras[(index + 1) % cameras.length]?.deviceId ?? null;
}

/** The id of the video track currently in a stream. */
export function currentCameraId(stream: MediaStream | null): string | undefined {
  return stream?.getVideoTracks()[0]?.getSettings().deviceId;
}

export function cameraById(deviceId: string): MediaStreamConstraints {
  return {
    video: { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } },
    audio: false,
  };
}
