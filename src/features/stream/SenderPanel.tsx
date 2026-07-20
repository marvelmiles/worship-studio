import { useEffect, useRef, useState } from "react";
import { KeyRound, Radio, RotateCcw, SwitchCamera, Wifi } from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import { useStore } from "../../store/useStore";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { createSender, type PeerStatus, type SenderHandle } from "./lib/peer";
import { decodeSignal, encodeSignal } from "./lib/streamSignal";
import { signalingConfigured } from "./lib/firebase";
import { deriveNetworkRoom } from "./lib/room";
import { publishBroadcaster, type BroadcastHandle } from "./lib/signaling";
import { ShowCode, ReadCode } from "./CodeExchange";

type Facing = "environment" | "user";

const CAMERA = (facing: Facing, audio: boolean): MediaStreamConstraints => ({
  video: {
    facingMode: facing,
    width: { ideal: 1920 },
    height: { ideal: 1080 },
  },
  audio,
});

/** A friendly name so the laptop's device list reads like something human. */
function deviceLabel(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "iPhone camera";
  if (/Android/.test(ua)) return "Android camera";
  return "Phone camera";
}

/**
 * Phone side. When a signalling backend is configured it defaults to one-tap
 * Broadcast — the laptop on the same WiFi sees this camera appear and picks it,
 * no codes at all. The QR / paste pairing remains as an always-available
 * fallback for offline venues or when the network can't be auto-detected.
 */
export function SenderPanel({
  wantAudio,
  onBack,
}: {
  wantAudio: boolean;
  onBack: () => void;
}) {
  const [mode, setMode] = useState<"auto" | "manual">(
    signalingConfigured ? "auto" : "manual",
  );

  if (mode === "auto") {
    return (
      <AutoBroadcastPanel
        wantAudio={wantAudio}
        onBack={onBack}
        onUseCode={() => setMode("manual")}
      />
    );
  }
  return (
    <ManualSenderPanel
      wantAudio={wantAudio}
      onBack={onBack}
      onUseOneTap={signalingConfigured ? () => setMode("auto") : undefined}
    />
  );
}

/* ------------------------------ One-tap broadcast ------------------------- */

type AutoPhase = "starting" | "waiting" | "connecting" | "live" | "failed";

function AutoBroadcastPanel({
  wantAudio,
  onBack,
  onUseCode,
}: {
  wantAudio: boolean;
  onBack: () => void;
  onUseCode: () => void;
}) {
  const { colors, fonts } = useUITheme();
  const pushToast = useStore((s) => s.pushToast);
  const [phase, setPhase] = useState<AutoPhase>("starting");
  const [facing, setFacing] = useState<Facing>("environment");
  const videoRef = useRef<HTMLVideoElement>(null);
  const broadcastRef = useRef<BroadcastHandle | null>(null);
  const senderRef = useRef<SenderHandle | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const answeredRef = useRef(false);

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
        stream = await navigator.mediaDevices.getUserMedia(
          CAMERA("environment", wantAudio),
        );
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

      let broadcast: BroadcastHandle;
      try {
        broadcast = publishBroadcaster(room, deviceLabel());
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
    // wantAudio is fixed for the life of this panel (chosen on the previous
    // screen), so this runs once and never restarts the live connection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Once the peer link is up, drop the SDP the middleman was holding.
  useEffect(() => {
    if (phase === "live") void broadcastRef.current?.clearCall();
  }, [phase]);

  const flipCamera = async () => {
    const next: Facing = facing === "environment" ? "user" : "environment";
    const sender = senderRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        CAMERA(next, false),
      );
      if (sender) {
        await sender.replaceVideo(stream);
        if (videoRef.current) videoRef.current.srcObject = sender.stream;
      } else {
        // Not connected yet — swap the preview/broadcast source directly.
        streamRef.current?.getVideoTracks().forEach((t) => t.stop());
        const audio = streamRef.current?.getAudioTracks() ?? [];
        const merged = new MediaStream([...stream.getVideoTracks(), ...audio]);
        streamRef.current = merged;
        if (videoRef.current) videoRef.current.srcObject = merged;
      }
      setFacing(next);
    } catch {
      pushToast("Couldn't switch cameras.", "error");
    }
  };

  const live = phase === "live";

  return (
    <div style={{ maxWidth: 460, margin: "0 auto" }}>
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
            Broadcasting your camera
          </span>
          {live && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "3px 9px",
                borderRadius: 999,
                background: "rgba(22,163,74,0.9)",
                color: "#fff",
                fontFamily: fonts.ui,
                fontSize: 10.5,
                fontWeight: 800,
              }}
            >
              <Wifi size={11} /> Connected
            </span>
          )}
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

        <AutoStatusLine phase={phase} />

        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <Button variant="ghost" size="sm" onClick={flipCamera}>
            <SwitchCamera size={14} />
            Flip camera
          </Button>
          <Button variant="danger" size="sm" onClick={onBack}>
            Stop
          </Button>
        </div>
      </div>

      <div style={{ marginTop: 16, textAlign: "center" }}>
        <Button variant="ghost" size="sm" onClick={onUseCode}>
          <KeyRound size={14} />
          Pair with a code instead
        </Button>
      </div>
    </div>
  );
}

function AutoStatusLine({ phase }: { phase: AutoPhase }) {
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
        <Spinner size={14} /> Waiting for the laptop to pick this camera. Open
        Stream → Display here on it.
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
        Connection dropped. Stop and start again, or use a code.
      </div>
    );
  return (
    <div style={{ ...base, color: colors.sub }}>
      You're live — the laptop is projecting this camera.
    </div>
  );
}

/* ------------------------------- QR / code pairing ------------------------ */

type Phase = "read-invite" | "streaming";

/**
 * Phone side, offline pairing. Reads the laptop's invite, opens the camera, and
 * shows the reply for the laptop to read back. Works with no internet at all.
 */
function ManualSenderPanel({
  wantAudio,
  onBack,
  onUseOneTap,
}: {
  wantAudio: boolean;
  onBack: () => void;
  onUseOneTap?: () => void;
}) {
  const { colors, fonts } = useUITheme();
  const pushToast = useStore((s) => s.pushToast);
  const [phase, setPhase] = useState<Phase>("read-invite");
  const [facing, setFacing] = useState<Facing>("environment");
  const [handle, setHandle] = useState<SenderHandle | null>(null);
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState<PeerStatus>("idle");
  const offerRef = useRef<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);

  const startStreaming = async (offerSdp: string, useFacing: Facing) => {
    offerRef.current = offerSdp;
    setPhase("streaming");
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        CAMERA(useFacing, wantAudio),
      );
      const sender = await createSender({
        offerSdp,
        stream,
        onStatus: setStatus,
      });
      setHandle(sender);
      setReply(encodeSignal("answer", sender.reply));
      if (videoRef.current) videoRef.current.srcObject = stream;
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
        "That doesn't look like an invite code from the laptop.",
        "error",
      );
      return;
    }
    void startStreaming(parsed.sdp, facing);
  };

  const flipCamera = async () => {
    const next: Facing = facing === "environment" ? "user" : "environment";
    if (!handle) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        CAMERA(next, false),
      );
      await handle.replaceVideo(stream);
      setFacing(next);
      if (videoRef.current) videoRef.current.srcObject = handle.stream;
    } catch {
      pushToast("Couldn't switch cameras.", "error");
    }
  };

  useEffect(() => () => handle?.close(), [handle]);

  const live = status === "live";

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
            Point your phone at the laptop
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
            On the laptop, open Stream → Display here. Scan the code it shows,
            or paste it.
          </p>
          <ReadCode
            scanFacing="environment"
            scanLabel="Aim at the code on the laptop screen."
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
              One-tap broadcast
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
          Show this reply to the laptop
        </div>
        {reply ? (
          <ShowCode
            value={reply}
            caption="On the laptop, scan or paste this to finish connecting."
          />
        ) : (
          <div style={{ padding: 24, display: "grid", placeItems: "center" }}>
            <Spinner size={20} />
          </div>
        )}
      </div>

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
            marginBottom: 12,
          }}
        >
          <span
            style={{
              fontFamily: fonts.display,
              fontSize: 16,
              fontWeight: 600,
              color: colors.text,
            }}
          >
            Your camera
          </span>
          {live && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "3px 9px",
                borderRadius: 999,
                background: "rgba(22,163,74,0.9)",
                color: "#fff",
                fontFamily: fonts.ui,
                fontSize: 10.5,
                fontWeight: 800,
              }}
            >
              <Wifi size={11} /> LIVE
            </span>
          )}
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
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <Button variant="ghost" size="sm" onClick={flipCamera}>
            <SwitchCamera size={14} />
            Flip camera
          </Button>
          <Button variant="danger" size="sm" onClick={onBack}>
            Stop streaming
          </Button>
        </div>
        {status === "connecting" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 12,
              fontFamily: fonts.ui,
              fontSize: 13,
              color: colors.sub,
            }}
          >
            <Spinner size={14} /> Waiting for the laptop to finish connecting…
          </div>
        )}
        {status === "failed" && (
          <p
            style={{
              fontFamily: fonts.ui,
              fontSize: 13,
              color: colors.danger,
              marginTop: 12,
            }}
          >
            Connection failed. Go back and exchange the codes again.
          </p>
        )}
      </div>
    </div>
  );
}
