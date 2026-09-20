import {
  MAX_VIDEO_BITRATE,
  MAX_VIDEO_FRAMERATE,
  PLAYOUT_DELAY_SECONDS,
  PREFERRED_AUDIO_CODECS,
  PREFERRED_VIDEO_CODECS,
  VIDEO_CONTENT_HINT,
  VIDEO_DEGRADATION_PREFERENCE,
} from "./videoQuality";

const PREFERRED_CODECS: Record<"video" | "audio", readonly string[]> = {
  video: PREFERRED_VIDEO_CODECS,
  audio: PREFERRED_AUDIO_CODECS,
};

// One entry per codec, in the browser's own order, so the offer names a profile the browser actually supports.
const narrowToPreferredCodecs = (
  codecs: readonly RTCRtpCodec[],
  preferred: readonly string[],
): RTCRtpCodec[] =>
  preferred.flatMap((mimeType) => {
    const match = codecs.find(
      (codec) => codec.mimeType.toLowerCase() === mimeType,
    );
    return match ? [match] : [];
  });

// A short codec list keeps the whole description inside one scannable QR; an unknown codec set is left untouched.
export const preferCompactCodecs = (
  transceiver: RTCRtpTransceiver,
  kind: "video" | "audio",
): void => {
  const capabilities = RTCRtpReceiver.getCapabilities?.(kind);
  if (!capabilities || typeof transceiver.setCodecPreferences !== "function") {
    return;
  }
  const codecs = narrowToPreferredCodecs(
    capabilities.codecs,
    PREFERRED_CODECS[kind],
  );
  if (codecs.length === 0) return;
  try {
    transceiver.setCodecPreferences(codecs);
  } catch {
    return;
  }
};

export const minimisePlayoutDelay = (connection: RTCPeerConnection): void => {
  for (const receiver of connection.getReceivers()) {
    const tunableReceiver = receiver as RTCRtpReceiver & {
      jitterBufferTarget?: number | null;
      playoutDelayHint?: number | null;
    };
    try {
      tunableReceiver.jitterBufferTarget = PLAYOUT_DELAY_SECONDS * 1000;
      tunableReceiver.playoutDelayHint = PLAYOUT_DELAY_SECONDS;
    } catch {
      continue;
    }
  }
};

type EncodingAdjustment = (
  encoding: RTCRtpEncodingParameters,
  parameters: RTCRtpSendParameters,
) => void;

const VIDEO_ENCODER_SETTINGS: readonly EncodingAdjustment[] = [
  (encoding) => {
    encoding.maxBitrate = MAX_VIDEO_BITRATE;
  },
  (encoding) => {
    encoding.maxFramerate = MAX_VIDEO_FRAMERATE;
  },
  (encoding) => {
    encoding.scaleResolutionDownBy = 1;
  },
  (_encoding, parameters) => {
    parameters.degradationPreference = VIDEO_DEGRADATION_PREFERENCE;
  },
];

const applyEncoderSettings = async (
  sender: RTCRtpSender,
  settings: readonly EncodingAdjustment[],
): Promise<boolean> => {
  const parameters = sender.getParameters();
  if (!parameters.encodings || parameters.encodings.length === 0) {
    parameters.encodings = [{}];
  }
  for (const applySetting of settings) {
    applySetting(parameters.encodings[0], parameters);
  }
  try {
    await sender.setParameters(parameters);
    return true;
  } catch {
    return false;
  }
};

// setParameters rejects the whole batch on one unsupported field, so settings are retried one at a time.
export const tuneVideoSender = async (
  connection: RTCPeerConnection,
): Promise<void> => {
  const videoSender = connection
    .getSenders()
    .find((sender) => sender.track?.kind === "video");
  if (!videoSender) return;
  if (videoSender.track) videoSender.track.contentHint = VIDEO_CONTENT_HINT;
  if (await applyEncoderSettings(videoSender, VIDEO_ENCODER_SETTINGS)) return;
  for (const setting of VIDEO_ENCODER_SETTINGS) {
    await applyEncoderSettings(videoSender, [setting]);
  }
};
