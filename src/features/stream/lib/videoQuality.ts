interface QualityRange {
  min: number;
  ideal: number;
}

const WIDTH: QualityRange = { min: 1280, ideal: 1920 };
const HEIGHT: QualityRange = { min: 720, ideal: 1080 };
const FRAME_RATE: QualityRange = { min: 24, ideal: 30 };
const ASPECT_RATIO = 16 / 9;

const captureProfile = (withFloors: boolean): MediaTrackConstraints => {
  const range = ({ min, ideal }: QualityRange) =>
    withFloors ? { min, ideal } : { ideal };
  return {
    width: range(WIDTH),
    height: range(HEIGHT),
    frameRate: range(FRAME_RATE),
    aspectRatio: { ideal: ASPECT_RATIO },
  };
};

export const VIDEO_CAPTURE = captureProfile(true);

export const VIDEO_CAPTURE_PREFERRED = captureProfile(false);

export const MAX_VIDEO_BITRATE = 6_000_000;

export const START_VIDEO_BITRATE = 2_500_000;

export const MAX_VIDEO_FRAMERATE = 30;

// The receiver's offer decides which encoder the phone runs; H.264 is the one phones encode in hardware.
export const PREFERRED_VIDEO_CODECS = ["video/h264", "video/vp8"] as const;

export const VIDEO_CONTENT_HINT = "motion";

export const VIDEO_DEGRADATION_PREFERENCE: RTCDegradationPreference =
  "balanced";

export const PLAYOUT_DELAY_SECONDS = 0.1;
