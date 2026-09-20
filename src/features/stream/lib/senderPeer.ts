import { setStreamAudioEnabled } from "./cameras";
import { detectDeviceName } from "../../../lib/deviceName";
import { watchConnectionStatus, type PeerStatus } from "./peerStatus";
import { tuneVideoSender } from "./peerTuning";
import {
  createPeerConnection,
  waitForIceGathering,
} from "../../../lib/webrtcPeer";
import { parseStatusMessage, sendStatusMessage } from "./statusChannel";

export interface SenderHandle {
  connection: RTCPeerConnection;
  reply: string;
  readonly stream: MediaStream;
  answerRestartOffer: (offerSdp: string) => Promise<string>;
  replaceVideo: (stream: MediaStream) => Promise<void>;
  setAudioEnabled: (enabled: boolean) => Promise<void>;
  close: () => void;
}

interface SenderOptions {
  offerSdp: string;
  stream: MediaStream;
  onStatus: (status: PeerStatus) => void;
  onViewerLive?: (live: boolean) => void;
}

const createLocalAnswer = async (
  connection: RTCPeerConnection,
  offerSdp: string,
  isRestart: boolean,
): Promise<string> => {
  await connection.setRemoteDescription({ type: "offer", sdp: offerSdp });
  await connection.setLocalDescription(await connection.createAnswer());
  await tuneVideoSender(connection);
  await waitForIceGathering(connection, { isRestart });
  return connection.localDescription?.sdp ?? "";
};

export const createSender = async (
  options: SenderOptions,
): Promise<SenderHandle> => {
  const connection = createPeerConnection();
  let currentStream = options.stream;
  let statusChannel: RTCDataChannel | null = null;
  let isAudioShared = currentStream.getAudioTracks().length > 0;

  watchConnectionStatus(connection, options.onStatus, () => {
    void tuneVideoSender(connection);
  });

  const pushAudioShared = () =>
    sendStatusMessage(statusChannel, {
      type: "audioShared",
      on: isAudioShared,
    });

  const pushDeviceName = async () => {
    const name = await detectDeviceName().catch(() => "");
    if (name) sendStatusMessage(statusChannel, { type: "deviceName", name });
  };

  const announceSelf = () => {
    pushAudioShared();
    void pushDeviceName();
  };

  connection.addEventListener("datachannel", (event) => {
    statusChannel = event.channel;
    event.channel.addEventListener("open", announceSelf);
    if (event.channel.readyState === "open") announceSelf();
    event.channel.addEventListener("message", (messageEvent) => {
      const message = parseStatusMessage(messageEvent.data);
      if (message?.type === "viewerLive") options.onViewerLive?.(message.live);
    });
  });

  await connection.setRemoteDescription({
    type: "offer",
    sdp: options.offerSdp,
  });

  // addTrack flips the receiver's recvonly video transceiver to send; a bare replaceTrack would leave it recvonly.
  const videoTrack = currentStream.getVideoTracks()[0];
  if (videoTrack) connection.addTrack(videoTrack, currentStream);

  const transceivers = connection.getTransceivers();
  const videoTransceiver = transceivers.find(
    (transceiver) => transceiver.sender.track?.kind === "video",
  );
  const audioTransceiver = transceivers.find(
    (transceiver) => transceiver !== videoTransceiver,
  );
  if (audioTransceiver) {
    audioTransceiver.direction = "sendonly";
    await audioTransceiver.sender.replaceTrack(
      currentStream.getAudioTracks()[0] ?? null,
    );
  }

  options.onStatus("gathering");
  await connection.setLocalDescription(await connection.createAnswer());
  await tuneVideoSender(connection);
  await waitForIceGathering(connection);
  options.onStatus("connecting");

  let restartQueue: Promise<unknown> = Promise.resolve();

  return {
    connection,
    reply: connection.localDescription?.sdp ?? "",
    get stream() {
      return currentStream;
    },
    answerRestartOffer: (offerSdp) => {
      const answer = restartQueue.then(() =>
        createLocalAnswer(connection, offerSdp, true),
      );
      restartQueue = answer.catch(() => undefined);
      return answer;
    },
    replaceVideo: async (nextStream) => {
      const nextTrack = nextStream.getVideoTracks()[0];
      if (nextTrack && videoTransceiver) {
        await videoTransceiver.sender.replaceTrack(nextTrack);
        await tuneVideoSender(connection);
      }
      for (const audioTrack of currentStream.getAudioTracks()) {
        nextStream.addTrack(audioTrack);
      }
      for (const oldVideoTrack of currentStream.getVideoTracks()) {
        if (oldVideoTrack !== nextTrack) oldVideoTrack.stop();
      }
      currentStream = nextStream;
    },
    setAudioEnabled: async (enabled) => {
      if (!audioTransceiver) return;
      await setStreamAudioEnabled(currentStream, enabled);
      await audioTransceiver.sender.replaceTrack(
        currentStream.getAudioTracks()[0] ?? null,
      );
      isAudioShared = enabled;
      pushAudioShared();
    },
    close: () => {
      connection.close();
      for (const track of currentStream.getTracks()) track.stop();
    },
  };
};
