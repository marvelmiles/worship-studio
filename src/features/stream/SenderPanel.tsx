import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  KeyRound,
  Radio,
  RotateCcw,
  SwitchCamera,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import { useStore } from "../../store/useStore";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { createSender, type PeerStatus, type SenderHandle } from "./lib/peer";
import { decodeSignal, encodeSignal } from "./lib/streamSignal";
import { signalingConfigured } from "./lib/firebase";
import { deriveNetworkRoom } from "./lib/room";
import { publishBroadcaster, type BroadcastHandle } from "./lib/signaling";
import {
  listCameras,
  openCameraFacing,
  cameraConstraints,
  setStreamAudioEnabled,
  type FacingMode,
} from "./lib/cameras";
import { detectDeviceName } from "./lib/deviceName";
import {
  StreamStatusBadge,
  type StreamBadgeStatus,
} from "./StreamStatusBadge";
import {
  useConnectionLifecycle,
  type ConnectionPhase,
} from "./lib/useConnectionLifecycle";
import { ShowCode, ReadCode } from "./CodeExchange";

/**
 * The sharing lobby. When a signalling backend is configured it defaults to a
 * quick automatic connect: the other device on the same WiFi sees this camera
 * appear and picks it, no codes at all. The QR / paste pairing remains as an
 * always available fallback for offline venues or when the network can't be
 * auto detected.
 *
 * On stop or disconnect the active flow is remounted from scratch (via a bumped
 * `key`), so the operator lands back in a fresh waiting lobby — camera reopened,
 * broadcasting again — ready for another viewer, exactly as if they had just
 * chosen "Share this camera". `onBack` leaves the lobby for the choose screen.
 */
export function SenderLobby({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<"auto" | "manual">(
    signalingConfigured ? "auto" : "manual",
  );
  const [resetNonce, setResetNonce] = useState(0);
  const reset = useCallback(() => setResetNonce((n) => n + 1), []);

  if (mode === "auto") {
    return (
      <AutoBroadcastPanel
        key={`auto-${resetNonce}`}
        onBack={onBack}
        onReset={reset}
        onUseCode={() => setMode("manual")}
      />
    );
  }
  return (
    <ManualSenderPanel
      key={`manual-${resetNonce}`}
      onBack={onBack}
      onReset={reset}
      onUseOneTap={signalingConfigured ? () => setMode("auto") : undefined}
    />
  );
}

/**
 * Owns the "Include audio" switch for a sharing panel. Whether the stream
 * carries sound is entirely the sender's choice: before a viewer connects it
 * adds/removes the microphone on the local stream; once connected it toggles
 * the live audio track over the existing transceiver, so it never renegotiates.
 */
function useIncludeAudio(
  getStream: () => MediaStream | null,
  getSender: () => SenderHandle | null,
) {
  const pushToast = useStore((s) => s.pushToast);
  const [audioOn, setAudioOn] = useState(false);

  const toggle = useCallback(async () => {
    const next = !audioOn;
    try {
      const sender = getSender();
      if (sender) {
        await sender.setAudioEnabled(next);
      } else {
        const stream = getStream();
        if (stream) await setStreamAudioEnabled(stream, next);
      }
      setAudioOn(next);
    } catch {
      pushToast(
        "Couldn't use the microphone. Allow mic access and try again.",
        "error",
      );
    }
  }, [audioOn, getSender, getStream, pushToast]);

  return { audioOn, toggle };
}

/** The sender's audio switch, styled to read as on/off at a glance. */
function AudioToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <Button
      variant={on ? "primary" : "ghost"}
      size="sm"
      onClick={onToggle}
      title={
        on
          ? "Audio is shared with the other device. Click to mute."
          : "Include this device's microphone in the stream."
      }
    >
      {on ? <Volume2 size={14} /> : <VolumeX size={14} />}
      {on ? "Audio on" : "Include audio"}
    </Button>
  );
}

/**
 * Front/back camera toggle. Reads as a toggle at a glance — the label names the
 * live lens and the icon mirrors when it's the front camera — so the operator can
 * see which side is active and that a tap flipped it, the same way the audio
 * button flips between its states.
 */
function CameraFlipButton({
  facing,
  onFlip,
}: {
  facing: FacingMode;
  onFlip: () => void;
}) {
  const onFront = facing === "user";
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onFlip}
      title={
        onFront ? "Switch to the back camera" : "Switch to the front camera"
      }
    >
      <SwitchCamera
        size={14}
        style={{ transform: onFront ? "scaleX(-1)" : undefined }}
      />
      {onFront ? "Front camera" : "Back camera"}
    </Button>
  );
}

/**
 * The shared camera card for both sharing flows — the live preview, a neutral
 * "Your camera" heading, and the include-audio, flip-camera and stop controls.
 * The one-tap and QR panels both render it so the camera display and its
 * stop/reconnect controls look and behave identically; only the surrounding
 * connection UI differs. `badge` and `statusLine` are slots each flow fills with
 * its own connection status. `onStop` returns to the choose screen — the single
 * path back for stopping and reconnecting — the same for both flows.
 */
function SharingCameraCard({
  videoRef,
  badge,
  statusLine,
  audioOn,
  onToggleAudio,
  facing,
  onFlip,
  hasMultipleCameras,
  onStop,
}: {
  videoRef: RefObject<HTMLVideoElement>;
  badge?: ReactNode;
  statusLine?: ReactNode;
  audioOn: boolean;
  onToggleAudio: () => void;
  facing: FacingMode;
  onFlip: () => void;
  hasMultipleCameras: boolean;
  onStop: () => void;
}) {
  const { colors, fonts } = useUITheme();
  return (
    <div
      style={{
        background: colors.raise,
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        padding: 18,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontFamily: fonts.display,
            fontSize: 16,
            fontWeight: 600,
            color: colors.text,
          }}
        >
          <Radio size={16} color={colors.accentSoft} />
          Your camera
        </span>
        {badge}
      </div>

      <div
        style={{
          position: "relative",
          borderRadius: 12,
          overflow: "hidden",
          background: "#000",
          aspectRatio: "16/9",
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>

      {statusLine}

      <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
        <AudioToggle on={audioOn} onToggle={onToggleAudio} />
        {hasMultipleCameras && (
          <CameraFlipButton facing={facing} onFlip={onFlip} />
        )}
        <Button variant="danger" size="sm" onClick={onStop}>
          Stop
        </Button>
      </div>
    </div>
  );
}

/**
 * Maps the one-tap flow's phase to the shared connection badge. A connected feed
 * the viewer has put on a display reads as "live on display".
 */
function autoPhaseBadge(phase: AutoPhase, viewerLive: boolean): StreamBadgeStatus {
  switch (phase) {
    case "connecting":
      return "connecting";
    case "live":
      return viewerLive ? "liveOnDisplay" : "connected";
    case "failed":
      return "disconnected";
    default:
      return "waiting";
  }
}

/** Maps a shared connection phase to the badge, promoting to "live on display". */
function phaseBadge(phase: ConnectionPhase, viewerLive: boolean): StreamBadgeStatus {
  if (phase === "connected") return viewerLive ? "liveOnDisplay" : "connected";
  if (phase === "disconnected") return "disconnected";
  return "waiting";
}

/* ------------------------------ One-tap broadcast ------------------------- */

type AutoPhase = "starting" | "waiting" | "connecting" | "live" | "failed";

function AutoBroadcastPanel({
  onBack,
  onReset,
  onUseCode,
}: {
  onBack: () => void;
  onReset: () => void;
  onUseCode: () => void;
}) {
  const pushToast = useStore((s) => s.pushToast);
  const [phase, setPhase] = useState<AutoPhase>("starting");
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [facing, setFacing] = useState<FacingMode>("environment");
  const [viewerLive, setViewerLive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const broadcastRef = useRef<BroadcastHandle | null>(null);
  const senderRef = useRef<SenderHandle | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const answeredRef = useRef(false);
  const { audioOn, toggle: toggleAudio } = useIncludeAudio(
    () => streamRef.current,
    () => senderRef.current,
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const room = await deriveNetworkRoom();
      if (cancelled) return;
      if (!room) {
        pushToast(
          "Couldn't detect your network for one-tap. Use a code instead.",
          "error",
        );
        onUseCode();
        return;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(cameraConstraints());
      } catch {
        if (!cancelled) {
          pushToast(
            "Couldn't open the camera. Allow camera access and try again.",
            "error",
          );
          onBack();
        }
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      // Labels (and so the flip button) are only available after permission.
      void listCameras().then((cams) => {
        if (!cancelled) setCameras(cams);
      });

      const name = await detectDeviceName();
      if (cancelled) return;
      let broadcast: BroadcastHandle;
      try {
        broadcast = publishBroadcaster(room, name);
      } catch {
        if (!cancelled) onUseCode();
        return;
      }
      broadcastRef.current = broadcast;
      setPhase("waiting");

      broadcast.onOffer(async (offerSdp) => {
        if (answeredRef.current || cancelled) return;
        answeredRef.current = true;
        setPhase("connecting");
        try {
          const sender = await createSender({
            offerSdp,
            // Use the current stream — the camera may have been flipped while
            // waiting for a laptop to pick this device.
            stream: streamRef.current ?? stream,
            onStatus: (s) => {
              if (cancelled) return;
              if (s === "live") setPhase("live");
              else if (s === "failed") setPhase("failed");
            },
            onViewerLive: (live) => {
              if (!cancelled) setViewerLive(live);
            },
          });
          senderRef.current = sender;
          await broadcast.sendAnswer(sender.reply);
        } catch {
          if (!cancelled) setPhase("failed");
        }
      });
    })();

    return () => {
      cancelled = true;
      void broadcastRef.current?.close();
      senderRef.current?.close();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // This effect owns the whole broadcast lifecycle, so it runs once and never
    // restarts the live connection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Once the peer link is up, drop the SDP the middleman was holding.
  useEffect(() => {
    if (phase === "live") void broadcastRef.current?.clearCall();
  }, [phase]);

  // The viewing device closed the link (it stopped, or the connection dropped).
  // Reset to a fresh waiting lobby — camera reopened, broadcasting again — so a
  // new viewer can pick this device up without the operator doing anything.
  useEffect(() => {
    if (phase !== "failed") return;
    pushToast("The viewing device disconnected. Waiting for a new connection.");
    onReset();
  }, [phase, pushToast, onReset]);

  const flipCamera = async () => {
    if (cameras.length < 2) {
      pushToast("This device only has one camera.", "error");
      return;
    }
    const target: FacingMode =
      facing === "environment" ? "user" : "environment";
    const sender = senderRef.current;
    try {
      const { stream, switched } = await openCameraFacing(
        target,
        streamRef.current,
        cameras,
      );
      if (sender) {
        await sender.replaceVideo(stream);
        streamRef.current = sender.stream;
        if (videoRef.current) videoRef.current.srcObject = sender.stream;
      } else {
        // Not connected yet: swap the preview/broadcast source directly, keeping
        // any microphone the operator already switched on. The old video track is
        // already stopped by openCameraFacing, so we only carry the audio across.
        const audio = streamRef.current?.getAudioTracks() ?? [];
        const merged = new MediaStream([...stream.getVideoTracks(), ...audio]);
        streamRef.current = merged;
        if (videoRef.current) videoRef.current.srcObject = merged;
      }
      if (switched) setFacing(target);
      else
        pushToast("This device wouldn't switch to the other camera.", "error");
    } catch {
      pushToast("Couldn't switch cameras.", "error");
    }
  };

  const hasMultipleCameras = cameras.length > 1;

  return (
    <div style={{ maxWidth: 460, margin: "0 auto" }}>
      <SharingCameraCard
        videoRef={videoRef}
        badge={
          <StreamStatusBadge status={autoPhaseBadge(phase, viewerLive)} size="sm" />
        }
        statusLine={<AutoStatusLine phase={phase} viewerLive={viewerLive} />}
        audioOn={audioOn}
        onToggleAudio={() => void toggleAudio()}
        facing={facing}
        onFlip={() => void flipCamera()}
        hasMultipleCameras={hasMultipleCameras}
        onStop={onReset}
      />

      <div
        style={{
          marginTop: 16,
          display: "flex",
          gap: 10,
          justifyContent: "center",
        }}
      >
        <Button variant="ghost" size="sm" onClick={onUseCode}>
          <KeyRound size={14} />
          Pair with a code instead
        </Button>
        <Button variant="ghost" size="sm" onClick={onBack}>
          <RotateCcw size={14} />
          Back
        </Button>
      </div>
    </div>
  );
}

function AutoStatusLine({
  phase,
  viewerLive,
}: {
  phase: AutoPhase;
  viewerLive: boolean;
}) {
  const { colors, fonts } = useUITheme();
  const base = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    fontFamily: fonts.ui,
    fontSize: 13,
  } as const;
  if (phase === "starting")
    return (
      <div style={{ ...base, color: colors.sub }}>
        <Spinner size={14} /> Getting your camera ready…
      </div>
    );
  if (phase === "waiting")
    return (
      <div style={{ ...base, color: colors.sub }}>
        <Spinner size={14} /> Waiting for another device to pick this camera. On
        it, open Stream and choose Show a camera here.
      </div>
    );
  if (phase === "connecting")
    return (
      <div style={{ ...base, color: colors.sub }}>
        <Spinner size={14} /> Connecting…
      </div>
    );
  if (phase === "failed")
    return (
      <div style={{ ...base, color: colors.danger }}>
        Connection dropped. Reconnecting…
      </div>
    );
  return (
    <div style={{ ...base, color: colors.sub }}>
      {viewerLive
        ? "You're live on the other device's display."
        : "You're connected. The other device is showing this camera."}
    </div>
  );
}

/** The QR flow's status line, shown under the shared camera preview. */
function ManualStatusLine({ phase }: { phase: ConnectionPhase }) {
  const { colors, fonts } = useUITheme();
  const base = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    fontFamily: fonts.ui,
    fontSize: 13,
  } as const;
  if (phase === "waiting")
    return (
      <div style={{ ...base, color: colors.sub }}>
        <Spinner size={14} /> Waiting for the other device to scan your reply…
      </div>
    );
  if (phase === "disconnected")
    return (
      <div style={{ ...base, color: colors.danger }}>
        The other device disconnected. Reconnecting…
      </div>
    );
  return null;
}

/* ------------------------------- QR / code pairing ------------------------ */

type Phase = "read-invite" | "streaming";

/**
 * Phone side, offline pairing. Reads the laptop's invite, opens the camera, and
 * shows the reply for the laptop to read back. Works with no internet at all.
 */
function ManualSenderPanel({
  onBack,
  onReset,
  onUseOneTap,
}: {
  onBack: () => void;
  onReset: () => void;
  onUseOneTap?: () => void;
}) {
  const { colors, fonts } = useUITheme();
  const pushToast = useStore((s) => s.pushToast);
  const [phase, setPhase] = useState<Phase>("read-invite");
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [facing, setFacing] = useState<FacingMode>("environment");
  const [handle, setHandle] = useState<SenderHandle | null>(null);
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState<PeerStatus>("idle");
  const [viewerLive, setViewerLive] = useState(false);
  const offerRef = useRef<string>("");
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { audioOn, toggle: toggleAudio } = useIncludeAudio(
    () => streamRef.current,
    () => handle,
  );

  // A failure before the first connection just means the viewer hasn't scanned
  // the reply yet — keep waiting. Only a drop after connecting is a real
  // disconnect, which resets to a fresh QR lobby.
  const connectionPhase = useConnectionLifecycle(status, () => {
    pushToast("The other device disconnected.");
    onReset();
  });

  const startStreaming = async (offerSdp: string) => {
    offerRef.current = offerSdp;
    setPhase("streaming");
    try {
      const stream =
        await navigator.mediaDevices.getUserMedia(cameraConstraints());
      streamRef.current = stream;
      const sender = await createSender({
        offerSdp,
        stream,
        onStatus: setStatus,
        onViewerLive: setViewerLive,
      });
      setHandle(sender);
      setReply(encodeSignal("answer", sender.reply));
      if (videoRef.current) videoRef.current.srcObject = stream;
      void listCameras().then(setCameras);
    } catch {
      pushToast(
        "Couldn't open the camera. Allow camera access and try again.",
        "error",
      );
      setPhase("read-invite");
    }
  };

  const applyInvite = (text: string) => {
    const parsed = decodeSignal(text);
    if (!parsed || parsed.kind !== "offer") {
      pushToast(
        "That doesn't look like an invite code from the other device.",
        "error",
      );
      return;
    }
    void startStreaming(parsed.sdp);
  };

  const flipCamera = async () => {
    if (!handle) return;
    if (cameras.length < 2) {
      pushToast("This device only has one camera.", "error");
      return;
    }
    const target: FacingMode =
      facing === "environment" ? "user" : "environment";
    try {
      const { stream, switched } = await openCameraFacing(
        target,
        streamRef.current,
        cameras,
      );
      await handle.replaceVideo(stream);
      streamRef.current = handle.stream;
      if (videoRef.current) videoRef.current.srcObject = handle.stream;
      if (switched) setFacing(target);
      else
        pushToast("This device wouldn't switch to the other camera.", "error");
    } catch {
      pushToast("Couldn't switch cameras.", "error");
    }
  };

  useEffect(() => () => handle?.close(), [handle]);
  // Stop the local capture if we leave before a connection took ownership of it.
  useEffect(
    () => () => streamRef.current?.getTracks().forEach((t) => t.stop()),
    [],
  );

  const hasMultipleCameras = cameras.length > 1;

  if (phase === "read-invite") {
    return (
      <div>
        <div
          style={{
            background: colors.raise,
            border: `1px solid ${colors.border}`,
            borderRadius: 16,
            padding: 18,
            maxWidth: 420,
            margin: "0 auto",
          }}
        >
          <div
            style={{
              fontFamily: fonts.display,
              fontSize: 17,
              fontWeight: 600,
              color: colors.text,
              marginBottom: 4,
            }}
          >
            Scan the other device's code
          </div>
          <p
            style={{
              fontFamily: fonts.ui,
              fontSize: 13,
              color: colors.sub,
              margin: "0 0 14px",
              lineHeight: 1.5,
            }}
          >
            On the other device, open Stream and choose Show a camera here. Scan
            the code it shows, or paste it.
          </p>
          <ReadCode
            scanFacing="environment"
            scanLabel="Aim at the code on the other device's screen."
            onCode={applyInvite}
          />
        </div>
        <div
          style={{
            marginTop: 18,
            textAlign: "center",
            display: "flex",
            gap: 10,
            justifyContent: "center",
          }}
        >
          {onUseOneTap && (
            <Button variant="ghost" size="sm" onClick={onUseOneTap}>
              <Radio size={14} />
              Quick connect
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onBack}>
            <RotateCcw size={14} />
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
        gap: 22,
        alignItems: "start",
      }}
    >
      <div
        style={{
          background: colors.raise,
          border: `1px solid ${colors.border}`,
          borderRadius: 16,
          padding: 18,
        }}
      >
        <div
          style={{
            fontFamily: fonts.display,
            fontSize: 16,
            fontWeight: 600,
            color: colors.text,
            marginBottom: 12,
          }}
        >
          Show this reply to the other device
        </div>
        {reply ? (
          <ShowCode
            value={reply}
            caption="On the other device, scan or paste this to finish connecting."
          />
        ) : (
          <div style={{ padding: 24, display: "grid", placeItems: "center" }}>
            <Spinner size={20} />
          </div>
        )}
      </div>

      <SharingCameraCard
        videoRef={videoRef}
        badge={
          <StreamStatusBadge
            status={phaseBadge(connectionPhase, viewerLive)}
            size="sm"
          />
        }
        statusLine={<ManualStatusLine phase={connectionPhase} />}
        audioOn={audioOn}
        onToggleAudio={() => void toggleAudio()}
        facing={facing}
        onFlip={() => void flipCamera()}
        hasMultipleCameras={hasMultipleCameras}
        onStop={onReset}
      />
    </div>
  );
}
