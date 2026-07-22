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

/**
 * The capture profile shared by every camera request. A LAN carries far more
 * than WebRTC's conservative default, so we ask the camera for a full 1080p30
 * feed and let the encoder push it at a high bitrate (see peer.ts). This is the
 * single source of truth for capture quality — both the initial camera and the
 * flip-to-next-camera path build their constraints from it.
 */
const VIDEO_QUALITY: MediaTrackConstraints = {
  width: { ideal: 1920 },
  height: { ideal: 1080 },
  frameRate: { ideal: 30 },
};

/**
 * Constraints for the first camera opened, preferring the rear lens. Video only:
 * the microphone is added on demand by the sender's "Include audio" toggle (see
 * setStreamAudioEnabled) rather than captured up front, so the mic is never
 * opened unless the operator asks for it.
 */
export function cameraConstraints(): MediaStreamConstraints {
  return {
    video: { facingMode: "environment", ...VIDEO_QUALITY },
    audio: false,
  };
}

/** Constraints for a specific camera, used when flipping between lenses. */
export function cameraById(deviceId: string): MediaStreamConstraints {
  return {
    video: { deviceId: { exact: deviceId }, ...VIDEO_QUALITY },
    audio: false,
  };
}

/**
 * Adds or removes a microphone track on an existing stream, in place, so the
 * sender can toggle audio without rebuilding the whole capture. Enabling opens
 * the mic and appends its track; disabling stops and detaches every audio
 * track. The video already flowing is untouched either way.
 */
export async function setStreamAudioEnabled(stream: MediaStream, enabled: boolean): Promise<void> {
  if (enabled) {
    if (stream.getAudioTracks().length > 0) return;
    const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
    const track = mic.getAudioTracks()[0];
    if (track) stream.addTrack(track);
    return;
  }
  for (const track of stream.getAudioTracks()) {
    track.stop();
    stream.removeTrack(track);
  }
}
