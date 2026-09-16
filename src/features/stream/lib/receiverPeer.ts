import { withVideoQualityHints } from "./sdp";
import { watchConnectionStatus, type PeerStatus } from "./peerStatus";
import {
  createPeerConnection,
  minimisePlayoutDelay,
  preferHardwareVideoCodec,
  waitForIceGathering,
} from "./peerTuning";
import {
  parseStatusMessage,
  sendStatusMessage,
  STATUS_CHANNEL_LABEL,
} from "./statusChannel";

export interface ReceiverHandle {
  connection: RTCPeerConnection;
  invite: string;
  accept: (answerSdp: string) => Promise<void>;
  createRestartOffer: () => Promise<string>;
  setViewerLive: (live: boolean) => void;
  close: () => void;
}

interface ReceiverOptions {
  onStream: (stream: MediaStream) => void;
  onStatus: (status: PeerStatus) => void;
  onAudioShared?: (shared: boolean) => void;
  onDeviceName?: (name: string) => void;
}

const createLocalOffer = async (
  connection: RTCPeerConnection,
  iceRestart = false,
): Promise<string> => {
  await connection.setLocalDescription(
    await connection.createOffer({ iceRestart }),
  );
  await waitForIceGathering(connection, { isRestart: iceRestart });
  // Only the copy sent to the sender carries bandwidth hints; browsers validate the local description against their own.
  return withVideoQualityHints(connection.localDescription?.sdp ?? "");
};

// The audio transceiver is always offered so the sender can toggle its mic later without renegotiating.
export const createReceiver = async (
  options: ReceiverOptions,
): Promise<ReceiverHandle> => {
  const connection = createPeerConnection();

  preferHardwareVideoCodec(
    connection.addTransceiver("video", { direction: "recvonly" }),
  );
  connection.addTransceiver("audio", { direction: "recvonly" });
  minimisePlayoutDelay(connection);

  const statusChannel = connection.createDataChannel(STATUS_CHANNEL_LABEL);
  let isViewerLive = false;
  const pushViewerLive = () =>
    sendStatusMessage(statusChannel, {
      type: "viewerLive",
      live: isViewerLive,
    });

  statusChannel.addEventListener("open", pushViewerLive);
  statusChannel.addEventListener("message", (event) => {
    const message = parseStatusMessage(event.data);
    if (message?.type === "audioShared") options.onAudioShared?.(message.on);
    if (message?.type === "deviceName") options.onDeviceName?.(message.name);
  });

  // Tracks arrive via replaceTrack with no stream id, so they are gathered into one stable stream here.
  const remoteStream = new MediaStream();
  connection.addEventListener("track", (event) => {
    remoteStream.addTrack(event.track);
    minimisePlayoutDelay(connection);
    options.onStream(remoteStream);
  });

  watchConnectionStatus(connection, options.onStatus, () =>
    minimisePlayoutDelay(connection),
  );

  options.onStatus("gathering");
  const invite = await createLocalOffer(connection);
  options.onStatus("waiting");

  return {
    connection,
    invite,
    accept: async (answerSdp) => {
      if (connection.connectionState === "new") options.onStatus("connecting");
      await connection.setRemoteDescription({ type: "answer", sdp: answerSdp });
    },
    createRestartOffer: () => createLocalOffer(connection, true),
    setViewerLive: (live) => {
      isViewerLive = live;
      pushViewerLive();
    },
    close: () => connection.close(),
  };
};
