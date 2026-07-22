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

import { setStreamAudioEnabled } from "./cameras";

export type PeerStatus = "idle" | "gathering" | "waiting" | "connecting" | "live" | "failed";

/**
 * The projected feed is a phone camera on the same WiFi filling a whole
 * projector, so image quality matters far more than WebRTC's default target.
 * On a LAN there is ample headroom, so we lift the encoder's ceiling to a
 * bitrate that keeps a full-screen 1080p feed crisp instead of soft and blocky.
 */
const MAX_VIDEO_BITRATE = 8_000_000;
const MAX_VIDEO_FRAMERATE = 30;

/** Camera streaming without an ICE server list: LAN-only, by construction. */
function createConnection(): RTCPeerConnection {
  return new RTCPeerConnection({ iceServers: [] });
}

/**
 * Raises the outgoing video quality above the browser's cautious default. The
 * WebRTC encoder aims low unless told otherwise; on a LAN that leaves a
 * projected feed looking soft. We lift the bitrate ceiling, hold the resolution
 * under load (dropping frame rate first — a worship camera reads better
 * sharp-and-steady than smooth-and-soft), and stop the encoder from downscaling.
 * Runs after each (re)negotiation, so both the initial track and a flipped
 * camera get the same treatment.
 */
async function tuneVideoSender(pc: RTCPeerConnection): Promise<void> {
  const videoSender = pc.getSenders().find((s) => s.track?.kind === "video");
  if (!videoSender) return;

  // contentHint is per-track, so it must be reset whenever the track changes.
  if (videoSender.track) videoSender.track.contentHint = "detail";

  const params = videoSender.getParameters();
  if (!params.encodings || params.encodings.length === 0) {
    params.encodings = [{}];
  }
  params.encodings[0].maxBitrate = MAX_VIDEO_BITRATE;
  params.encodings[0].maxFramerate = MAX_VIDEO_FRAMERATE;
  params.encodings[0].scaleResolutionDownBy = 1;
  params.degradationPreference = "maintain-resolution";

  try {
    await videoSender.setParameters(params);
  } catch {
    /* a browser may reject param changes mid-negotiation; the feed still runs */
  }
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
 *
 * The audio transceiver is always offered even though the receiver never knows
 * in advance whether the sender will send sound. Declaring it up front is what
 * lets the sender turn its microphone on or off at any time (via replaceTrack,
 * no renegotiation) — the decision to include audio belongs entirely to the
 * sender. With no audio track from the sender the m-line simply stays silent.
 */
export async function createReceiver(options: {
  onStream: (stream: MediaStream) => void;
  onStatus: (status: PeerStatus) => void;
}): Promise<ReceiverHandle> {
  const pc = createConnection();

  pc.addTransceiver("video", { direction: "recvonly" });
  pc.addTransceiver("audio", { direction: "recvonly" });

  // Assemble every incoming track into one stable stream rather than trusting
  // event.streams: the sender attaches tracks with replaceTrack (which carries
  // no stream id) and may add its microphone only later, so the video and a
  // late-arriving audio track must be gathered into the same MediaStream here.
  const remote = new MediaStream();
  pc.addEventListener("track", (event) => {
    remote.addTrack(event.track);
    options.onStream(remote);
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
  /**
   * Turns the outgoing microphone on or off mid-stream. Uses the audio
   * transceiver the receiver always declares, so it never renegotiates.
   */
  setAudioEnabled: (enabled: boolean) => Promise<void>;
  close: () => void;
}

/**
 * The kind of media an offer-declared transceiver carries. After
 * setRemoteDescription each transceiver has a receiver track whose kind names
 * its m-line, which is what lets us match the sender's video/audio slots
 * without depending on m-line order.
 */
function transceiverKind(transceiver: RTCRtpTransceiver): string | undefined {
  return transceiver.receiver.track?.kind ?? transceiver.sender.track?.kind;
}

/**
 * Phone side. Takes the laptop's offer, attaches the chosen camera and
 * produces the reply that completes the link.
 *
 * Tracks are placed onto the transceivers the offer already declared (video
 * always, audio only when the operator opted in) rather than added as fresh
 * ones, so the answer mirrors the offer's m-lines exactly and audio can be
 * toggled later over the same transceiver.
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

  let current = options.stream;
  const videoTransceiver = pc.getTransceivers().find((t) => transceiverKind(t) === "video");
  const audioTransceiver = pc.getTransceivers().find((t) => transceiverKind(t) === "audio");
  await videoTransceiver?.sender.replaceTrack(current.getVideoTracks()[0] ?? null);
  await audioTransceiver?.sender.replaceTrack(current.getAudioTracks()[0] ?? null);

  options.onStatus("gathering");
  await pc.setLocalDescription(await pc.createAnswer());
  await tuneVideoSender(pc);
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
      if (nextTrack && videoTransceiver) {
        await videoTransceiver.sender.replaceTrack(nextTrack);
        // Re-apply the quality settings: the new track resets its content hint,
        // and replaceTrack does not carry the encoder tuning across.
        await tuneVideoSender(pc);
      }
      // Keep the microphone alive across a camera flip: carry the existing audio
      // track onto the new stream, and stop only the old camera's video.
      for (const audio of current.getAudioTracks()) next.addTrack(audio);
      for (const video of current.getVideoTracks()) video.stop();
      current = next;
    },
    setAudioEnabled: async (enabled: boolean) => {
      if (!audioTransceiver) return;
      await setStreamAudioEnabled(current, enabled);
      await audioTransceiver.sender.replaceTrack(current.getAudioTracks()[0] ?? null);
    },
    close: () => {
      pc.close();
      for (const track of current.getTracks()) track.stop();
    },
  };
}
