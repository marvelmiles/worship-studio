import {
  createPeerConnection,
  waitForIceGathering,
} from "../../../lib/webrtcPeer";
import { SHARE_CHANNEL_LABEL } from "./shareProtocol";

/* Long enough for a phone to wake its radio and gather candidates, short
   enough that a device which never answers stops holding up the queue. */
export const LINK_TIMEOUT_MS = 25000;

export interface ShareLinkOptions {
  /**
   * How long the channel has to open, or null to wait for as long as it takes.
   * A link paired by hand waits on a person lining up a camera, so it only
   * starts counting once both codes have been read.
   */
  timeoutMs?: number | null;
}

export interface ShareLink {
  connection: RTCPeerConnection;
  /** The open channel, once the two devices are talking to each other. */
  ready: Promise<RTCDataChannel>;
  close: () => void;
}

const whenChannelOpen = (
  connection: RTCPeerConnection,
  channel: Promise<RTCDataChannel>,
  timeoutMs: number | null,
): Promise<RTCDataChannel> =>
  new Promise((resolve, reject) => {
    let settled = false;
    const finish = (run: () => void) => {
      if (settled) return;
      settled = true;
      if (timer !== null) window.clearTimeout(timer);
      connection.removeEventListener("connectionstatechange", onStateChange);
      run();
    };
    const fail = (reason: string) => finish(() => reject(new Error(reason)));

    const timer =
      timeoutMs === null
        ? null
        : window.setTimeout(
            () => fail("The other device did not answer."),
            timeoutMs,
          );
    const onStateChange = () => {
      if (
        connection.connectionState === "failed" ||
        connection.connectionState === "closed"
      ) {
        fail("The devices could not reach each other.");
      }
    };
    connection.addEventListener("connectionstatechange", onStateChange);

    void channel
      .then((open) => {
        if (open.readyState === "open") {
          finish(() => resolve(open));
          return;
        }
        open.addEventListener("open", () => finish(() => resolve(open)));
        open.addEventListener("error", () => fail("The link closed."));
        open.addEventListener("close", () => fail("The link closed."));
      })
      .catch(() => fail("The link could not be opened."));
  });

const closeLink = (connection: RTCPeerConnection) => () => {
  try {
    connection.close();
  } catch {
    return;
  }
};

/** The sending side: it opens the channel the archive travels down. */
export const openShareLink = async ({
  timeoutMs = LINK_TIMEOUT_MS,
}: ShareLinkOptions = {}): Promise<{
  link: ShareLink;
  offerSdp: string;
}> => {
  const connection = createPeerConnection();
  const channel = connection.createDataChannel(SHARE_CHANNEL_LABEL, {
    ordered: true,
  });
  channel.binaryType = "arraybuffer";
  const ready = whenChannelOpen(
    connection,
    Promise.resolve(channel),
    timeoutMs,
  );
  await connection.setLocalDescription(await connection.createOffer());
  await waitForIceGathering(connection);
  return {
    link: { connection, ready, close: closeLink(connection) },
    offerSdp: connection.localDescription?.sdp ?? "",
  };
};

export const completeShareLink = async (
  link: ShareLink,
  answerSdp: string,
): Promise<void> => {
  await link.connection.setRemoteDescription({
    type: "answer",
    sdp: answerSdp,
  });
};

/** The receiving side: it waits for the channel the sender opens. */
export const acceptShareLink = async (
  offerSdp: string,
  { timeoutMs = LINK_TIMEOUT_MS }: ShareLinkOptions = {},
): Promise<{ link: ShareLink; answerSdp: string }> => {
  const connection = createPeerConnection();
  const channel = new Promise<RTCDataChannel>((resolve) => {
    connection.addEventListener("datachannel", (event) => {
      if (event.channel.label !== SHARE_CHANNEL_LABEL) return;
      event.channel.binaryType = "arraybuffer";
      resolve(event.channel);
    });
  });
  const ready = whenChannelOpen(connection, channel, timeoutMs);
  await connection.setRemoteDescription({ type: "offer", sdp: offerSdp });
  await connection.setLocalDescription(await connection.createAnswer());
  await waitForIceGathering(connection);
  return {
    link: { connection, ready, close: closeLink(connection) },
    answerSdp: connection.localDescription?.sdp ?? "",
  };
};
