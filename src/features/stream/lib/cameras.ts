import { VIDEO_CAPTURE, VIDEO_CAPTURE_PREFERRED } from "./videoQuality";

export const listCameras = async (): Promise<MediaDeviceInfo[]> => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === "videoinput");
  } catch {
    return [];
  }
};

export type FacingMode = "user" | "environment";

type LensSelector = Pick<MediaTrackConstraints, "facingMode" | "deviceId">;

// Asked in descending order: resolution floors first, so a device cannot quietly hand back a 640x480 capture.
const lensAttempts = (lens: LensSelector): MediaStreamConstraints[] => {
  return [
    { video: { ...lens, ...VIDEO_CAPTURE }, audio: false },
    { video: { ...lens, ...VIDEO_CAPTURE_PREFERRED }, audio: false },
    { video: { ...lens }, audio: false },
  ];
};

const cameraById = (deviceId: string): MediaStreamConstraints[] => {
  return lensAttempts({ deviceId: { exact: deviceId } });
};

const facingAttempts = (facingMode: FacingMode): MediaStreamConstraints[] => {
  return [
    ...lensAttempts({ facingMode: { exact: facingMode } }),
    ...lensAttempts({ facingMode }),
  ];
};

const openFirstCamera = async (
  attempts: MediaStreamConstraints[],
): Promise<MediaStream | null> => {
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch {}
  }
  return null;
};

export const openCamera = async (): Promise<MediaStream> => {
  const stream = await openFirstCamera([
    ...lensAttempts({ facingMode: "environment" }),
    ...lensAttempts({}),
  ]);
  if (!stream) throw new Error("No camera could be opened");
  return stream;
};

export const reopenCamera = async (
  facing: FacingMode,
): Promise<MediaStream> => {
  const stream = await openFirstCamera([
    ...facingAttempts(facing),
    ...lensAttempts({}),
  ]);
  if (!stream) throw new Error("No camera could be reopened");
  return stream;
};

interface CameraIdentity {
  deviceId?: string;
  label?: string;
  facingMode?: string;
}

const cameraIdentity = (track?: MediaStreamTrack): CameraIdentity => {
  if (!track) return {};
  const settings = track.getSettings();
  return {
    deviceId: settings.deviceId,
    label: track.label,
    facingMode: settings.facingMode,
  };
};

const isSameCamera = (a: CameraIdentity, b: CameraIdentity): boolean => {
  if (a.deviceId && b.deviceId) return a.deviceId === b.deviceId;
  if (a.label && b.label) return a.label === b.label;
  if (a.facingMode && b.facingMode) return a.facingMode === b.facingMode;
  return false;
};

export interface CameraSwitch {
  stream: MediaStream;
  switched: boolean;
}

export const openCameraFacing = async (
  facing: FacingMode,
  stream: MediaStream | null,
  cameras: MediaDeviceInfo[],
): Promise<CameraSwitch> => {
  const currentTrack = stream?.getVideoTracks()[0];
  const current = cameraIdentity(currentTrack);

  const switchAttempts: MediaStreamConstraints[] = [...facingAttempts(facing)];
  const startIndex = cameras.findIndex((c) => c.deviceId === current.deviceId);
  for (let offset = 1; offset <= cameras.length; offset += 1) {
    const camera = cameras[(Math.max(startIndex, 0) + offset) % cameras.length];
    if (camera?.deviceId && camera.deviceId !== current.deviceId) {
      switchAttempts.push(...cameraById(camera.deviceId));
    }
  }

  // Many phones hold one camera at a time, so the current one is released before the other is opened.
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
};

const AUDIO_QUALITY: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1,
};

export const setStreamAudioEnabled = async (
  stream: MediaStream,
  enabled: boolean,
): Promise<void> => {
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
};
