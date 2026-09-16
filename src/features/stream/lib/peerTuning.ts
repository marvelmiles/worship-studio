import {
  MAX_VIDEO_BITRATE,
  MAX_VIDEO_FRAMERATE,
  PLAYOUT_DELAY_SECONDS,
  PREFERRED_VIDEO_CODECS,
  VIDEO_CONTENT_HINT,
  VIDEO_DEGRADATION_PREFERENCE,
} from "./videoQuality";

const ICE_GATHERING_TIMEOUT_MS = 3000;

// No ICE servers: only LAN host candidates are gathered, so media never leaves the local network.
export const createPeerConnection = (): RTCPeerConnection =>
  new RTCPeerConnection({ iceServers: [] });

// Reorders instead of filtering, so a sender without a preferred codec can still negotiate.
export const preferHardwareVideoCodec = (
  transceiver: RTCRtpTransceiver,
): void => {
  const capabilities = RTCRtpReceiver.getCapabilities?.("video");
  if (!capabilities || typeof transceiver.setCodecPreferences !== "function") {
    return;
  }
  type VideoCodec = (typeof capabilities.codecs)[number];
  const codecRank = (codec: VideoCodec): number => {
    const index = PREFERRED_VIDEO_CODECS.indexOf(
      codec.mimeType.toLowerCase() as (typeof PREFERRED_VIDEO_CODECS)[number],
    );
    return index === -1 ? PREFERRED_VIDEO_CODECS.length : index;
  };
  try {
    transceiver.setCodecPreferences(
      [...capabilities.codecs].sort((a, b) => codecRank(a) - codecRank(b)),
    );
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

// Non-trickle signalling: wait for every candidate, with a timeout for browsers that never report completion.
export const waitForIceGathering = (
  connection: RTCPeerConnection,
  { isRestart = false, timeoutMs = ICE_GATHERING_TIMEOUT_MS } = {},
): Promise<void> => {
  if (!isRestart && connection.iceGatheringState === "complete") {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const finish = () => {
      connection.removeEventListener("icegatheringstatechange", onChange);
      window.clearTimeout(timer);
      resolve();
    };
    const onChange = () => {
      if (connection.iceGatheringState === "complete") finish();
    };
    const timer = window.setTimeout(finish, timeoutMs);
    connection.addEventListener("icegatheringstatechange", onChange);
  });
};
