/**
 * Camera enumeration helpers for the sender. A device with more than one camera
 * exposes each as a separate video input; switching (see openNextCamera) walks
 * those inputs to open a genuinely different one, which works the same on a phone
 * (front/back and its extra rear lenses) and a laptop (built-in/USB).
 */

export async function listCameras(): Promise<MediaDeviceInfo[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === "videoinput");
  } catch {
    return [];
  }
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

type FacingMode = "user" | "environment";

/**
 * The front/back orientation the current video track is reporting, if any. Phones
 * populate this on every camera track; laptops and desktops generally don't, which
 * is exactly how we tell the two apart when deciding how to switch cameras.
 */
export function currentFacingMode(stream: MediaStream | null): FacingMode | undefined {
  const facing = stream?.getVideoTracks()[0]?.getSettings().facingMode;
  return facing === "user" || facing === "environment" ? facing : undefined;
}

/** Constraints that pin a specific front/back lens, used to flip a phone camera. */
export function cameraByFacing(facingMode: FacingMode): MediaStreamConstraints {
  return {
    video: { facingMode: { exact: facingMode }, ...VIDEO_QUALITY },
    audio: false,
  };
}

/**
 * Whether two video tracks are the same physical camera, judged on whatever
 * identifying signal the device actually exposes. Budget phones frequently leave
 * deviceId or facingMode blank, so we fall through the available signals in turn:
 * deviceId, then label, then facingMode. When nothing is comparable we report
 * "not the same", so a switch is attempted rather than silently suppressed.
 */
function isSameCamera(a?: MediaStreamTrack, b?: MediaStreamTrack): boolean {
  if (!a || !b) return false;
  const sa = a.getSettings();
  const sb = b.getSettings();
  if (sa.deviceId && sb.deviceId) return sa.deviceId === sb.deviceId;
  if (a.label && b.label) return a.label === b.label;
  if (sa.facingMode && sb.facingMode) return sa.facingMode === sb.facingMode;
  return false;
}

/**
 * Opens a camera that is genuinely different from the one currently streaming,
 * video only. Returns the new stream, or throws if no other camera can be opened.
 *
 * Budget Android phones are wildly inconsistent here — some ignore a `deviceId`
 * constraint and always hand back the default camera, some leave deviceId or
 * facingMode blank so cycling can't tell two inputs apart, some list several rear
 * lenses as separate inputs. Trusting any single strategy fails on one device or
 * another, so we try everything and keep the first result that is actually a
 * different camera from the live one:
 *
 *   1. every enumerated video input, by id, ordered to continue the cycle just
 *      after the current camera (so repeated switches walk through them all);
 *   2. a front/back facingMode flip, for devices that ignore deviceId but still
 *      honour the orientation.
 *
 * Every attempt is verified against the live track with {@link isSameCamera}; an
 * attempt that reopens the same camera, or fails outright, is discarded and the
 * next is tried. Only when nothing yields a different camera do we give up.
 */
export async function openNextCamera(
  stream: MediaStream | null,
  cameras: MediaDeviceInfo[],
): Promise<MediaStream> {
  const currentTrack = stream?.getVideoTracks()[0];
  const currentId = currentTrack?.getSettings().deviceId;

  const attempts: MediaStreamConstraints[] = [];

  // Every other input, ordered to continue the cycle from the current camera.
  const startIndex = cameras.findIndex((c) => c.deviceId === currentId);
  for (let offset = 1; offset <= cameras.length; offset += 1) {
    const camera = cameras[(Math.max(startIndex, 0) + offset) % cameras.length];
    if (camera?.deviceId && camera.deviceId !== currentId) {
      attempts.push(cameraById(camera.deviceId));
    }
  }

  // Front/back flips, for devices that ignore deviceId but honour orientation.
  const facing = currentFacingMode(stream);
  const facingTargets: FacingMode[] =
    facing === "user" ? ["environment"] : facing === "environment" ? ["user"] : ["environment", "user"];
  for (const target of facingTargets) attempts.push(cameraByFacing(target));

  for (const constraints of attempts) {
    let opened: MediaStream;
    try {
      opened = await navigator.mediaDevices.getUserMedia(constraints);
    } catch {
      continue;
    }
    if (!isSameCamera(currentTrack, opened.getVideoTracks()[0])) return opened;
    // Reopened the same camera — release it and try the next strategy.
    opened.getTracks().forEach((track) => track.stop());
  }

  throw new Error("No other camera to switch to");
}

/**
 * The microphone capture profile. The phone and laptop sit in the same room, so
 * the laptop plays the phone's audio out loud and the phone's mic hears it back
 * — a feedback loop that, left alone, echoes badly. `audio: true` leaves this to
 * the browser's defaults, which on mobile are often weak or off, so we ask for
 * the built-in DSP explicitly: echo cancellation removes the far-end sound the
 * mic re-captures, noise suppression strips room hum, and auto gain keeps the
 * level steady. Mono is enough for a spoken/sung feed and gives the canceller a
 * single clean channel to work on. This is the single source of truth for mic
 * capture, shared by every "Include audio" toggle.
 */
const AUDIO_QUALITY: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1,
};

/**
 * Adds or removes a microphone track on an existing stream, in place, so the
 * sender can toggle audio without rebuilding the whole capture. Enabling opens
 * the mic and appends its track; disabling stops and detaches every audio
 * track. The video already flowing is untouched either way.
 */
export async function setStreamAudioEnabled(stream: MediaStream, enabled: boolean): Promise<void> {
  if (enabled) {
    if (stream.getAudioTracks().length > 0) return;
    const mic = await navigator.mediaDevices.getUserMedia({ audio: AUDIO_QUALITY });
    const track = mic.getAudioTracks()[0];
    if (track) stream.addTrack(track);
    return;
  }
  for (const track of stream.getAudioTracks()) {
    track.stop();
    stream.removeTrack(track);
  }
}
