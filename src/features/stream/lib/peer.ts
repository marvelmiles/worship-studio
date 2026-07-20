/**
 * The WebRTC half of the stream module: a phone sends its camera to a laptop
 * on the same WiFi, and nothing leaves the local network.
 *
 * Two deliberate choices shape this:
 *
 * 1. **No ICE servers.** With an empty `iceServers` list the browser gathers
 *    only host candidates — the device's own LAN addresses. On one WiFi that
 *    is all that is needed, it keeps the handshake payload small enough for a
 *    QR code, and it guarantees no media is ever relayed off the network.
 *
 * 2. **Non-trickle.** Signalling happens once, by QR or paste, so there is no
 *    channel to deliver candidates over afterwards. Both sides wait for ICE
 *    gathering to finish and ship one complete description.
 */

export type PeerStatus = "idle" | "gathering" | "waiting" | "connecting" | "live" | "failed";

/** Camera streaming without an ICE server list: LAN-only, by construction. */
function createConnection(): RTCPeerConnection {
  return new RTCPeerConnection({ iceServers: [] });
}

/**
 * Resolves once ICE gathering completes, so the description carries every
 * candidate. Falls back on a timeout because a browser occasionally never
 * fires the completion event; a description with the candidates gathered so
 * far still connects on a healthy LAN.
 */
function waitForIceGathering(pc: RTCPeerConnection, timeoutMs = 3000): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      pc.removeEventListener("icegatheringstatechange", onChange);
      window.clearTimeout(timer);
      resolve();
    };
    const onChange = () => {
      if (pc.iceGatheringState === "complete") done();
    };
    const timer = window.setTimeout(done, timeoutMs);
    pc.addEventListener("icegatheringstatechange", onChange);
  });
}

export interface ReceiverHandle {
  pc: RTCPeerConnection;
  /** Compressed offer for the phone to scan or paste. */
  invite: string;
  /** Feed the phone's reply in to complete the handshake. */
  accept: (answerSdp: string) => Promise<void>;
  close: () => void;
}

/**
 * Laptop side. Creates the offer up front so its QR can be on screen before
 * the phone joins, and declares both transceivers receive-only: this device
 * publishes nothing, it only displays.
 */
export async function createReceiver(options: {
  wantAudio: boolean;
  onStream: (stream: MediaStream) => void;
  onStatus: (status: PeerStatus) => void;
}): Promise<ReceiverHandle> {
  const pc = createConnection();

  pc.addTransceiver("video", { direction: "recvonly" });
  if (options.wantAudio) pc.addTransceiver("audio", { direction: "recvonly" });

  pc.addEventListener("track", (event) => {
    if (event.streams[0]) options.onStream(event.streams[0]);
  });
  pc.addEventListener("connectionstatechange", () => {
    if (pc.connectionState === "connected") options.onStatus("live");
    else if (pc.connectionState === "connecting") options.onStatus("connecting");
    else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
      options.onStatus("failed");
    }
  });

  options.onStatus("gathering");
  await pc.setLocalDescription(await pc.createOffer());
  await waitForIceGathering(pc);
  options.onStatus("waiting");

  return {
    pc,
    invite: pc.localDescription?.sdp ?? "",
    accept: async (answerSdp: string) => {
      options.onStatus("connecting");
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
    },
    close: () => pc.close(),
  };
}

export interface SenderHandle {
  pc: RTCPeerConnection;
  /** Compressed answer for the laptop to scan or paste. */
  reply: string;
  stream: MediaStream;
  /**
   * Swaps the outgoing camera in place, keeping the live connection. Flipping
   * cameras must not renegotiate — the laptop is already paired with this
   * connection, so a rebuilt one would never reach it.
   */
  replaceVideo: (stream: MediaStream) => Promise<void>;
  close: () => void;
}

/**
 * Phone side. Takes the laptop's offer, attaches the chosen camera and
 * produces the reply that completes the link.
 */
export async function createSender(options: {
  offerSdp: string;
  stream: MediaStream;
  onStatus: (status: PeerStatus) => void;
}): Promise<SenderHandle> {
  const pc = createConnection();

  pc.addEventListener("connectionstatechange", () => {
    if (pc.connectionState === "connected") options.onStatus("live");
    else if (pc.connectionState === "connecting") options.onStatus("connecting");
    else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
      options.onStatus("failed");
    }
  });

  await pc.setRemoteDescription({ type: "offer", sdp: options.offerSdp });
  // Tracks are added after the remote description so they attach to the
  // transceivers the offer already declared, instead of adding new ones the
  // laptop never asked for.
  let current = options.stream;
  for (const track of current.getTracks()) pc.addTrack(track, current);

  options.onStatus("gathering");
  await pc.setLocalDescription(await pc.createAnswer());
  await waitForIceGathering(pc);
  options.onStatus("connecting");

  return {
    pc,
    reply: pc.localDescription?.sdp ?? "",
    get stream() {
      return current;
    },
    replaceVideo: async (next: MediaStream) => {
      const nextTrack = next.getVideoTracks()[0];
      const videoSender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (nextTrack && videoSender) await videoSender.replaceTrack(nextTrack);
      // Drop the old camera's tracks now that the new one is carrying the feed.
      for (const track of current.getVideoTracks()) track.stop();
      current = next;
    },
    close: () => {
      pc.close();
      for (const track of current.getTracks()) track.stop();
    },
  };
}
