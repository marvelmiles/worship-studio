/**
 * Camera capture for the sender. A device with more than one camera exposes each
 * as a separate video input; switching (see openCameraFacing) opens the
 * requested front/back lens, which works the same on a phone (front/back and its
 * extra rear lenses) and a laptop (built-in/USB).
 *
 * Every camera here is opened through the same quality ladder, so the picture
 * profile can't drift between the first camera and a flipped one. The profile
 * itself lives in videoQuality.ts, alongside the encoder settings that have to
 * agree with it.
 */

import { VIDEO_CAPTURE, VIDEO_CAPTURE_PREFERRED } from "./videoQuality";

export async function listCameras(): Promise<MediaDeviceInfo[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === "videoinput");
  } catch {
    return [];
  }
}

export type FacingMode = "user" | "environment";

/** Which physical camera to open, with no bearing on the quality asked of it. */
type LensSelector = Pick<MediaTrackConstraints, "facingMode" | "deviceId">;

/**
 * Every request we will make for one lens, best first: the full profile with its
 * resolution floors, the same profile as a preference only, then the bare lens.
 *
 * The ladder exists because the floors in VIDEO_CAPTURE are what stop a device
 * quietly handing back a 640x480 capture to be stretched over a projector — but
 * those same floors are genuinely out of reach for some laptop webcams, where
 * insisting would mean no camera at all. Asking in descending order gets the
 * best picture the hardware can actually produce, rather than the cheapest one
 * it would like to offer.
 *
 * Video only: the microphone is added on demand by the sender's "Include audio"
 * toggle (see setStreamAudioEnabled) rather than captured up front, so the mic is
 * never opened unless the operator asks for it.
 */
function lensAttempts(lens: LensSelector): MediaStreamConstraints[] {
  return [
    { video: { ...lens, ...VIDEO_CAPTURE }, audio: false },
    { video: { ...lens, ...VIDEO_CAPTURE_PREFERRED }, audio: false },
    { video: { ...lens }, audio: false },
  ];
}

/** Requests for a specific camera, used when flipping between lenses. */
function cameraById(deviceId: string): MediaStreamConstraints[] {
  return lensAttempts({ deviceId: { exact: deviceId } });
}

/** Both the strict (exact) and loose (ideal) forms of a facing request. */
function facingAttempts(facingMode: FacingMode): MediaStreamConstraints[] {
  return [
    ...lensAttempts({ facingMode: { exact: facingMode } }),
    ...lensAttempts({ facingMode }),
  ];
}

/** Opens the first of the given requests that succeeds, or null if none do. */
async function openFirstCamera(
  attempts: MediaStreamConstraints[],
): Promise<MediaStream | null> {
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch {
      /* try the next candidate */
    }
  }
  return null;
}

/**
 * Opens the camera a broadcast starts on, preferring the rear lens and the best
 * picture the device will give. Throws only when no camera opens at all, which
 * callers surface as a permission prompt.
 */
export async function openCamera(): Promise<MediaStream> {
  const stream = await openFirstCamera([
    ...lensAttempts({ facingMode: "environment" }),
    ...lensAttempts({}),
  ]);
  if (!stream) throw new Error("No camera could be opened");
  return stream;
}

/**
 * A camera's identity, captured as plain values so it survives the track being
 * stopped (a stopped track may stop reporting its settings). Judged on whatever
 * signal the device actually exposes — budget phones often leave deviceId or
 * facingMode blank.
 */
interface CameraIdentity {
  deviceId?: string;
  label?: string;
  facingMode?: string;
}

function cameraIdentity(track?: MediaStreamTrack): CameraIdentity {
  if (!track) return {};
  const settings = track.getSettings();
  return {
    deviceId: settings.deviceId,
    label: track.label,
    facingMode: settings.facingMode,
  };
}

/**
 * Whether two cameras are the same physical one. Falls through the available
 * signals in turn — deviceId, then label, then facingMode. When nothing is
 * comparable we report "not the same", so a switch is accepted rather than
 * silently suppressed.
 */
function isSameCamera(a: CameraIdentity, b: CameraIdentity): boolean {
  if (a.deviceId && b.deviceId) return a.deviceId === b.deviceId;
  if (a.label && b.label) return a.label === b.label;
  if (a.facingMode && b.facingMode) return a.facingMode === b.facingMode;
  return false;
}

export interface CameraSwitch {
  /** The stream now to broadcast — a different camera when switched, else the original restored. */
  stream: MediaStream;
  /** Whether a genuinely different camera was opened. */
  switched: boolean;
}

/**
 * Switches the sender to the requested front/back camera, video only. Returns the
 * new stream (switched: true), or — if that camera can't be opened — the original
 * reopened so the broadcast keeps running (switched: false). Throws only if even
 * the original can't be reopened.
 *
 * Budget Android phones are wildly inconsistent: some ignore a `deviceId`
 * constraint and always hand back the default camera; some leave deviceId or
 * facingMode blank so cycling can't tell inputs apart; many can hold only one
 * camera open at a time, so a second getUserMedia fails while the first is live.
 * Trusting any single strategy fails on one device or another, so we:
 *
 *   1. release the current camera first (required by single-camera-at-a-time
 *      hardware; the preview shows a brief black frame, the normal cost of a
 *      flip on such devices);
 *   2. ask for the requested facing (strict then loose), then — for devices that
 *      ignore facingMode — fall back to any other enumerated input, which on a
 *      phone with just a front and back camera is exactly the other side; keep
 *      the first result verified as a different camera than the original;
 *   3. if nothing else opens, reopen the original so the stream survives.
 */
export async function openCameraFacing(
  facing: FacingMode,
  stream: MediaStream | null,
  cameras: MediaDeviceInfo[],
): Promise<CameraSwitch> {
  const currentTrack = stream?.getVideoTracks()[0];
  const current = cameraIdentity(currentTrack);

  // The requested front/back lens first; every other input as a fallback for
  // devices that don't honour facingMode.
  const switchAttempts: MediaStreamConstraints[] = [...facingAttempts(facing)];
  const startIndex = cameras.findIndex((c) => c.deviceId === current.deviceId);
  for (let offset = 1; offset <= cameras.length; offset += 1) {
    const camera = cameras[(Math.max(startIndex, 0) + offset) % cameras.length];
    if (camera?.deviceId && camera.deviceId !== current.deviceId) {
      switchAttempts.push(...cameraById(camera.deviceId));
    }
  }

  // Free the current camera so single-camera-at-a-time hardware can open another.
  currentTrack?.stop();

  for (const constraints of switchAttempts) {
    let opened: MediaStream;
    try {
      opened = await navigator.mediaDevices.getUserMedia(constraints);
    } catch {
      continue;
    }
    if (!isSameCamera(current, cameraIdentity(opened.getVideoTracks()[0]))) {
      return { stream: opened, switched: true };
    }
    opened.getTracks().forEach((track) => track.stop());
  }

  // No other camera opened — restore the original so the broadcast keeps running.
  const restoreAttempts: MediaStreamConstraints[] = [];
  if (current.deviceId) restoreAttempts.push(...cameraById(current.deviceId));
  if (current.facingMode === "user" || current.facingMode === "environment") {
    restoreAttempts.push(...facingAttempts(current.facingMode));
  }
  restoreAttempts.push(...lensAttempts({}));

  const restored = await openFirstCamera(restoreAttempts);
  if (restored) return { stream: restored, switched: false };

  throw new Error(
    "Camera switch failed and the original could not be reopened",
  );
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
export async function setStreamAudioEnabled(
  stream: MediaStream,
  enabled: boolean,
): Promise<void> {
  if (enabled) {
    if (stream.getAudioTracks().length > 0) return;
    const mic = await navigator.mediaDevices.getUserMedia({
      audio: AUDIO_QUALITY,
    });
    const track = mic.getAudioTracks()[0];
    if (track) stream.addTrack(track);
    return;
  }
  for (const track of stream.getAudioTracks()) {
    track.stop();
    stream.removeTrack(track);
  }
}
