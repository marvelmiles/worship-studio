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
import { withVideoQualityHints } from "./sdp";
import {
  MAX_VIDEO_BITRATE,
  MAX_VIDEO_FRAMERATE,
  PLAYOUT_DELAY_SECONDS,
  PREFERRED_VIDEO_CODECS,
  VIDEO_CONTENT_HINT,
  VIDEO_DEGRADATION_PREFERENCE,
} from "./videoQuality";

export type PeerStatus =
  "idle" | "gathering" | "waiting" | "connecting" | "live" | "failed";

/** Camera streaming without an ICE server list: LAN-only, by construction. */
function createConnection(): RTCPeerConnection {
  return new RTCPeerConnection({ iceServers: [] });
}

/**
 * Puts the codecs a phone can encode in hardware at the front of a video
 * transceiver's list, so the offer asks for one of those first.
 *
 * Reorders rather than filters. Dropping the unpreferred codecs would be a
 * stronger guarantee and a worse trade: a sender that supports none of ours
 * would have nothing left to negotiate and simply fail to connect. Everything
 * the browser can do stays on the list, just further down, and the sort is
 * stable so entries of equal rank — including the retransmission and
 * error-correction pseudo-codecs — keep their original relative order.
 */
function preferHardwareVideoCodec(transceiver: RTCRtpTransceiver): void {
  const capabilities = RTCRtpReceiver.getCapabilities?.("video");
  if (!capabilities || typeof transceiver.setCodecPreferences !== "function") {
    return;
  }

  // Read the codec type off the capabilities themselves: the DOM lib has
  // renamed it across TypeScript versions, and this can't go stale.
  type VideoCodec = (typeof capabilities.codecs)[number];

  const rank = (codec: VideoCodec): number => {
    const index = PREFERRED_VIDEO_CODECS.indexOf(
      codec.mimeType.toLowerCase() as (typeof PREFERRED_VIDEO_CODECS)[number],
    );
    return index === -1 ? PREFERRED_VIDEO_CODECS.length : index;
  };

  try {
    transceiver.setCodecPreferences(
      [...capabilities.codecs].sort((a, b) => rank(a) - rank(b)),
    );
  } catch {
    /* an unsupported ordering leaves the browser's default, which still works */
  }
}

/**
 * Asks every receiver on the connection to keep its playout buffer small.
 *
 * `jitterBufferTarget` is the standard control and takes milliseconds;
 * `playoutDelayHint` is the older name still shipping in some builds and takes
 * seconds. Both are set and each is ignored where it isn't recognised. Assigning
 * an unknown property is harmless, so no capability check is needed — only the
 * guard against a browser that rejects the write outright.
 */
function minimisePlayoutDelay(pc: RTCPeerConnection): void {
  for (const receiver of pc.getReceivers()) {
    const tunable = receiver as RTCRtpReceiver & {
      jitterBufferTarget?: number | null;
      playoutDelayHint?: number | null;
    };
    try {
      tunable.jitterBufferTarget = PLAYOUT_DELAY_SECONDS * 1000;
      tunable.playoutDelayHint = PLAYOUT_DELAY_SECONDS;
    } catch {
      /* read-only on this browser; its own default buffer applies */
    }
  }
}

/** One encoder setting, applied to the send parameters in place. */
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

/**
 * Applies a set of encoder settings in one transaction. Returns whether the
 * browser accepted it — `setParameters` is all-or-nothing, so a single member it
 * dislikes rejects everything sent alongside it.
 */
async function applyEncoderSettings(
  sender: RTCRtpSender,
  settings: readonly EncodingAdjustment[],
): Promise<boolean> {
  // Parameters must be read fresh each time: setParameters only accepts an
  // object carrying the transaction id from the most recent getParameters.
  const parameters = sender.getParameters();
  if (!parameters.encodings || parameters.encodings.length === 0) {
    parameters.encodings = [{}];
  }
  for (const apply of settings) apply(parameters.encodings[0], parameters);

  try {
    await sender.setParameters(parameters);
    return true;
  } catch {
    return false;
  }
}

/**
 * Raises the outgoing video quality above the browser's cautious default: a
 * bitrate ceiling a projected 1080p feed can actually use, a frame rate cap, no
 * standing downscale, and an adaptation policy that trims a little of everything
 * under load rather than stalling the picture.
 *
 * The settings are retried one at a time if the batch is refused. Browsers
 * disagree about which encoding parameters they accept and when — Safari is
 * particularly reluctant while a negotiation is still in flight — and because
 * `setParameters` rejects the whole object on one bad member, sending them as a
 * single block meant one unsupported field silently took the bitrate ceiling
 * down with it, leaving the encoder at the default that made the feed soft in
 * the first place.
 *
 * Runs after each (re)negotiation and again once the connection settles, so both
 * the initial track and a flipped camera get the same treatment even on a
 * browser that would only accept the change later.
 */
async function tuneVideoSender(pc: RTCPeerConnection): Promise<void> {
  const videoSender = pc.getSenders().find((s) => s.track?.kind === "video");
  if (!videoSender) return;

  // contentHint is per-track, so it must be reset whenever the track changes.
  if (videoSender.track) videoSender.track.contentHint = VIDEO_CONTENT_HINT;

  if (await applyEncoderSettings(videoSender, VIDEO_ENCODER_SETTINGS)) return;
  for (const setting of VIDEO_ENCODER_SETTINGS) {
    await applyEncoderSettings(videoSender, [setting]);
  }
}

/**
 * Resolves once ICE gathering completes, so the description carries every
 * candidate. Falls back on a timeout because a browser occasionally never
 * fires the completion event; a description with the candidates gathered so
 * far still connects on a healthy LAN.
 */
function waitForIceGathering(
  pc: RTCPeerConnection,
  timeoutMs = 3000,
): Promise<void> {
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
  /**
   * Tell the sender whether this device has put the feed live on a display, so
   * the sender's card can reflect it. Sent over the control data channel; the
   * latest value is (re)sent whenever the channel opens.
   */
  setViewerLive: (live: boolean) => void;
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
  /** Fired when the sender reports whether it is currently sharing its microphone. */
  onAudioShared?: (shared: boolean) => void;
}): Promise<ReceiverHandle> {
  const pc = createConnection();

  // The offer's codec order is what decides which encoder the phone runs, so
  // this one call is the difference between a hardware and a software encode on
  // an iPhone — and so between a sharp, in-time feed and a soft, laggy one.
  const videoTransceiver = pc.addTransceiver("video", {
    direction: "recvonly",
  });
  preferHardwareVideoCodec(videoTransceiver);
  pc.addTransceiver("audio", { direction: "recvonly" });
  minimisePlayoutDelay(pc);

  // A tiny bidirectional control channel, created before the offer so it's
  // negotiated in the one handshake. The receiver tells the sender when the feed
  // has gone live on a display; the sender tells the receiver when it toggles its
  // microphone. Created here (the offerer) so the sender simply receives it via
  // ondatachannel — no renegotiation. The mic state comes over this channel
  // rather than from the received track's `muted` flag because browsers are slow
  // and unreliable about flipping a remote track to muted when RTP merely stops.
  const statusChannel = pc.createDataChannel("status");
  let viewerLive = false;
  const pushViewerLive = () => {
    if (statusChannel.readyState !== "open") return;
    try {
      statusChannel.send(
        JSON.stringify({ type: "viewerLive", live: viewerLive }),
      );
    } catch {
      /* channel closing; nothing we can do, the sender keeps its last value */
    }
  };
  statusChannel.addEventListener("open", pushViewerLive);
  statusChannel.addEventListener("message", (event) => {
    try {
      const parsed = JSON.parse(event.data as string);
      if (parsed?.type === "audioShared")
        options.onAudioShared?.(Boolean(parsed.on));
    } catch {
      /* ignore anything that isn't our small JSON status message */
    }
  });

  // Assemble every incoming track into one stable stream rather than trusting
  // event.streams: the sender attaches tracks with replaceTrack (which carries
  // no stream id) and may add its microphone only later, so the video and a
  // late-arriving audio track must be gathered into the same MediaStream here.
  const remote = new MediaStream();
  pc.addEventListener("track", (event) => {
    remote.addTrack(event.track);
    // A receiver's buffer target can be reset when its track is attached, so
    // re-assert it here as well as at construction.
    minimisePlayoutDelay(pc);
    options.onStream(remote);
  });
  pc.addEventListener("connectionstatechange", () => {
    if (pc.connectionState === "connected") {
      minimisePlayoutDelay(pc);
      options.onStatus("live");
    } else if (pc.connectionState === "connecting")
      options.onStatus("connecting");
    else if (
      pc.connectionState === "failed" ||
      pc.connectionState === "disconnected"
    ) {
      options.onStatus("failed");
    }
  });

  options.onStatus("gathering");
  await pc.setLocalDescription(await pc.createOffer());
  await waitForIceGathering(pc);
  options.onStatus("waiting");

  return {
    pc,
    // Only the copy that travels to the sender carries the bandwidth hints. The
    // local description is left exactly as the browser generated it, because
    // browsers validate a modified one against their own and this side does no
    // encoding, so it has nothing to gain from them anyway.
    invite: withVideoQualityHints(pc.localDescription?.sdp ?? ""),
    accept: async (answerSdp: string) => {
      options.onStatus("connecting");
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
    },
    setViewerLive: (live: boolean) => {
      viewerLive = live;
      pushViewerLive();
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
 * Phone side. Takes the laptop's offer, attaches the chosen camera and
 * produces the reply that completes the link.
 */
export async function createSender(options: {
  offerSdp: string;
  stream: MediaStream;
  onStatus: (status: PeerStatus) => void;
  /** Fired when the viewer reports whether it has put the feed live on a display. */
  onViewerLive?: (live: boolean) => void;
}): Promise<SenderHandle> {
  const pc = createConnection();

  pc.addEventListener("connectionstatechange", () => {
    if (pc.connectionState === "connected") {
      // Re-apply the encoder settings now the connection is stable. A browser
      // that refused them mid-handshake accepts them here, and this is the point
      // at which the encoder would otherwise settle on its cautious defaults.
      void tuneVideoSender(pc);
      options.onStatus("live");
    } else if (pc.connectionState === "connecting")
      options.onStatus("connecting");
    else if (
      pc.connectionState === "failed" ||
      pc.connectionState === "disconnected"
    ) {
      options.onStatus("failed");
    }
  });

  // The receiver's bidirectional control channel. It tells us when the feed goes
  // live on a display; we tell it when the microphone is toggled. Arrives via
  // ondatachannel because the receiver (offerer) created it.
  let statusChannel: RTCDataChannel | null = null;
  let audioShared = false;
  const pushAudioShared = () => {
    if (statusChannel?.readyState !== "open") return;
    try {
      statusChannel.send(
        JSON.stringify({ type: "audioShared", on: audioShared }),
      );
    } catch {
      /* channel closing; the receiver keeps its last value */
    }
  };
  pc.addEventListener("datachannel", (event) => {
    statusChannel = event.channel;
    // Send the current mic state on open, covering audio toggled before connect.
    event.channel.addEventListener("open", pushAudioShared);
    if (event.channel.readyState === "open") pushAudioShared();
    event.channel.addEventListener("message", (message) => {
      try {
        const parsed = JSON.parse(message.data as string);
        if (parsed?.type === "viewerLive")
          options.onViewerLive?.(Boolean(parsed.live));
      } catch {
        /* ignore anything that isn't our small JSON status message */
      }
    });
  });

  await pc.setRemoteDescription({ type: "offer", sdp: options.offerSdp });

  let current = options.stream;
  // The stream may already carry a mic track (audio switched on before a viewer
  // connected), so seed the shared-audio state from it.
  audioShared = current.getAudioTracks().length > 0;

  // Video: addTrack reuses the receiver's recvonly video transceiver, flips it
  // to send and tags the stream — the reliable path for the camera feed. (A bare
  // replaceTrack would attach the track but leave the direction recvonly, so the
  // answer would broadcast nothing.)
  const videoTrack = current.getVideoTracks()[0];
  if (videoTrack) pc.addTrack(videoTrack, current);

  // Audio: the remaining transceiver. Force it sendonly so a live audio channel
  // is always negotiated even before the mic is on — that's what lets the mic be
  // toggled over it later with no renegotiation — and attach it now if it's on.
  const videoTransceiver = pc
    .getTransceivers()
    .find((t) => t.sender.track?.kind === "video");
  const audioTransceiver = pc
    .getTransceivers()
    .find((t) => t !== videoTransceiver);
  if (audioTransceiver) {
    audioTransceiver.direction = "sendonly";
    await audioTransceiver.sender.replaceTrack(
      current.getAudioTracks()[0] ?? null,
    );
  }

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
      await audioTransceiver.sender.replaceTrack(
        current.getAudioTracks()[0] ?? null,
      );
      audioShared = enabled;
      pushAudioShared();
    },
    close: () => {
      pc.close();
      for (const track of current.getTracks()) track.stop();
    },
  };
}
