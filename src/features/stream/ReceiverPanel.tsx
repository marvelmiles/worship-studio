import { useEffect, useRef, useState } from "react";
import { KeyRound, MonitorSmartphone, RotateCcw, Smartphone, Wifi } from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import { useStore } from "../../store/useStore";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { createReceiver, type PeerStatus, type ReceiverHandle } from "./lib/peer";
import { decodeSignal, encodeSignal } from "./lib/streamSignal";
import { signalingConfigured } from "./lib/firebase";
import { deriveNetworkRoom } from "./lib/room";
import { watchBroadcasters, requestStream, type CallHandle, type DeviceEntry } from "./lib/signaling";
import { ShowCode, ReadCode } from "./CodeExchange";
import { ProjectionSurface } from "./ProjectionSurface";

/**
 * Laptop side. With a signalling backend configured it defaults to a live list
 * of phones broadcasting on the same WiFi — tap one to go live and project it,
 * no codes. The QR / paste pairing stays available as an offline fallback.
 */
export function ReceiverPanel({ wantAudio, onBack }: { wantAudio: boolean; onBack: () => void }) {
  const [mode, setMode] = useState<"auto" | "manual">(signalingConfigured ? "auto" : "manual");

  if (mode === "auto") {
    return <AutoReceivePanel wantAudio={wantAudio} onBack={onBack} onUseCode={() => setMode("manual")} />;
  }
  return (
    <ManualReceiverPanel
      wantAudio={wantAudio}
      onBack={onBack}
      onUseOneTap={signalingConfigured ? () => setMode("auto") : undefined}
    />
  );
}

/* ------------------------------- One-tap receive -------------------------- */

type AutoPhase = "finding" | "waiting" | "connecting" | "live" | "failed";

function AutoReceivePanel({
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
  const [phase, setPhase] = useState<AutoPhase>("finding");
  const [devices, setDevices] = useState<DeviceEntry[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [connecting, setConnecting] = useState<DeviceEntry | null>(null);
  const roomRef = useRef<string | null>(null);
  const handleRef = useRef<ReceiverHandle | null>(null);
  const callRef = useRef<CallHandle | null>(null);
  const answeredRef = useRef(false);
  const viewerId = useRef(crypto.randomUUID()).current;

  useEffect(() => {
    let cancelled = false;
    let unwatch = () => {};

    deriveNetworkRoom().then((room) => {
      if (cancelled) return;
      if (!room) {
        pushToast("Couldn't detect your network for one-tap. Use a code instead.", "error");
        onUseCode();
        return;
      }
      roomRef.current = room;
      setPhase("waiting");
      unwatch = watchBroadcasters(room, (list) => {
        if (!cancelled) setDevices(list);
      });
    });

    return () => {
      cancelled = true;
      unwatch();
      void callRef.current?.close();
      handleRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Once connected, drop the SDP the middleman was holding.
  useEffect(() => {
    if (phase === "live") void callRef.current?.close();
  }, [phase]);

  const disconnect = () => {
    void callRef.current?.close();
    handleRef.current?.close();
    callRef.current = null;
    handleRef.current = null;
    answeredRef.current = false;
    setStream(null);
    setConnecting(null);
    setPhase("waiting");
  };

  const connect = async (device: DeviceEntry) => {
    const room = roomRef.current;
    if (!room || phase === "connecting" || phase === "live") return;
    setConnecting(device);
    setPhase("connecting");
    answeredRef.current = false;
    try {
      const receiver = await createReceiver({
        wantAudio,
        onStream: (s) => setStream(s),
        onStatus: (s: PeerStatus) => {
          if (s === "live") setPhase("live");
          else if (s === "failed") setPhase("failed");
        },
      });
      handleRef.current = receiver;
      const call = requestStream(room, device.id, viewerId, receiver.invite);
      callRef.current = call;
      call.onAnswer((answerSdp) => {
        if (answeredRef.current) return;
        answeredRef.current = true;
        void receiver.accept(answerSdp).catch(() => setPhase("failed"));
      });
    } catch {
      setPhase("failed");
    }
  };

  if (phase === "live" && stream) {
    return (
      <div>
        <ProjectionSurface stream={stream} wantAudio={wantAudio} onStop={disconnect} />
        <div style={{ marginTop: 14, textAlign: "center", fontFamily: fonts.ui, fontSize: 13, color: colors.sub }}>
          Projecting {connecting?.name ?? "a camera"}. Stop to pick a different one.
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <div style={{ background: colors.raise, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
          <MonitorSmartphone size={18} color={colors.accentSoft} />
          <span style={{ fontFamily: fonts.display, fontSize: 17, fontWeight: 600, color: colors.text }}>
            Phones on your WiFi
          </span>
        </div>
        <p style={{ fontFamily: fonts.ui, fontSize: 13, color: colors.sub, margin: "0 0 16px", lineHeight: 1.5 }}>
          On the phone, open Stream → Send my camera → it broadcasts automatically. Pick it here to go live.
        </p>

        {phase === "finding" ? (
          <Centered>
            <Spinner size={20} />
            <span style={{ fontFamily: fonts.ui, fontSize: 13, color: colors.sub }}>Finding your network…</span>
          </Centered>
        ) : devices.length === 0 ? (
          <Centered>
            <Spinner size={20} />
            <span style={{ fontFamily: fonts.ui, fontSize: 13, color: colors.sub }}>
              Waiting for a phone to start broadcasting…
            </span>
          </Centered>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {devices.map((d) => {
              const isConnecting = phase === "connecting" && connecting?.id === d.id;
              return (
                <div
                  key={d.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <span style={{ width: 38, height: 38, borderRadius: 10, display: "grid", placeItems: "center", background: colors.raise, color: colors.accentSoft, flexShrink: 0 }}>
                    <Smartphone size={18} />
                  </span>
                  <span style={{ flex: 1, fontFamily: fonts.ui, fontSize: 14, fontWeight: 600, color: colors.text }}>
                    {d.name}
                  </span>
                  <Button variant="primary" size="sm" onClick={() => connect(d)} disabled={phase === "connecting"}>
                    {isConnecting ? <Spinner size={14} /> : <Wifi size={14} />}
                    {isConnecting ? "Connecting…" : "Connect"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {phase === "failed" && (
          <p style={{ fontFamily: fonts.ui, fontSize: 13, color: colors.danger, marginTop: 14 }}>
            Couldn't connect to that phone. Make sure both devices are on the same WiFi and try again.
          </p>
        )}
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 10, justifyContent: "center" }}>
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

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "28px 0" }}>
      {children}
    </div>
  );
}

/* ------------------------------- QR / code pairing ------------------------ */

/**
 * Laptop side, offline pairing. Publishes an invite QR for the phone, takes the
 * phone's reply, then projects the incoming camera. Works with no internet.
 */
function ManualReceiverPanel({
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
  const [handle, setHandle] = useState<ReceiverHandle | null>(null);
  const [invite, setInvite] = useState("");
  const [status, setStatus] = useState<PeerStatus>("idle");
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    let live = true;
    let created: ReceiverHandle | null = null;
    createReceiver({
      wantAudio,
      onStream: (s) => live && setStream(s),
      onStatus: (s) => live && setStatus(s),
    })
      .then((h) => {
        if (!live) {
          h.close();
          return;
        }
        created = h;
        setHandle(h);
        setInvite(encodeSignal("offer", h.invite));
      })
      .catch(() => pushToast("Couldn't start the receiver on this device.", "error"));
    return () => {
      live = false;
      created?.close();
    };
  }, [wantAudio, pushToast]);

  const applyReply = (text: string) => {
    const parsed = decodeSignal(text);
    if (!parsed || parsed.kind !== "answer") {
      pushToast("That doesn't look like a reply code from the phone.", "error");
      return;
    }
    void handle?.accept(parsed.sdp).catch(() => pushToast("Couldn't complete the connection.", "error"));
  };

  const live = status === "live";

  if (live) {
    return <ProjectionSurface stream={stream} wantAudio={wantAudio} onStop={onBack} />;
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 22, alignItems: "start" }}>
        <Step n={1} title="Show this to your phone">
          {invite ? (
            <ShowCode
              value={invite}
              caption="On your phone: open this app → Stream → Send my camera, then scan this code (or paste it)."
            />
          ) : (
            <div style={{ padding: 30, display: "grid", placeItems: "center" }}>
              <Spinner size={22} />
            </div>
          )}
        </Step>

        <Step n={2} title="Then read your phone's reply">
          <ReadCode
            scanFacing="user"
            scanLabel="Hold your phone's reply code up to this computer's camera."
            onCode={applyReply}
          />
          <StatusLine status={status} />
        </Step>
      </div>

      <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
        {onUseOneTap && (
          <Button variant="ghost" size="sm" onClick={onUseOneTap}>
            <MonitorSmartphone size={14} />
            One-tap connect
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

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  const { colors, fonts } = useUITheme();
  return (
    <div style={{ background: colors.raise, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
        <span style={{ width: 24, height: 24, borderRadius: 999, display: "grid", placeItems: "center", background: colors.accent, color: "#fff", fontFamily: fonts.ui, fontSize: 12.5, fontWeight: 800 }}>
          {n}
        </span>
        <span style={{ fontFamily: fonts.display, fontSize: 16, fontWeight: 600, color: colors.text }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function StatusLine({ status }: { status: PeerStatus }) {
  const { colors, fonts } = useUITheme();
  if (status === "idle" || status === "gathering" || status === "waiting") return null;
  const label =
    status === "connecting" ? "Connecting to your phone…" : status === "failed" ? "Connection failed. Try the code again." : "";
  if (!label) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontFamily: fonts.ui, fontSize: 13, color: status === "failed" ? colors.danger : colors.sub }}>
      {status === "connecting" && <Spinner size={14} />}
      {label}
    </div>
  );
}
