import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, RotateCcw, Wifi, X } from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import { useStore } from "../../store/useStore";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { createReceiver, type PeerStatus, type ReceiverHandle } from "./lib/peer";
import { decodeSignal, encodeSignal } from "./lib/streamSignal";
import { ShowCode, ReadCode } from "./CodeExchange";

/**
 * Laptop side. Publishes an invite for the phone, takes the phone's reply, then
 * displays the incoming camera. The operator projects it by moving this window
 * (or its fullscreen) to the HDMI display, the same way the rest of the app
 * projects to an external screen.
 */
export function ReceiverPanel({ wantAudio, onBack }: { wantAudio: boolean; onBack: () => void }) {
  const { colors, fonts } = useUITheme();
  const pushToast = useStore((s) => s.pushToast);
  const [handle, setHandle] = useState<ReceiverHandle | null>(null);
  const [invite, setInvite] = useState("");
  const [status, setStatus] = useState<PeerStatus>("idle");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (stream && videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const applyReply = (text: string) => {
    const parsed = decodeSignal(text);
    if (!parsed || parsed.kind !== "answer") {
      pushToast("That doesn't look like a reply code from the phone.", "error");
      return;
    }
    void handle?.accept(parsed.sdp).catch(() => pushToast("Couldn't complete the connection.", "error"));
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen?.();
    else void shellRef.current?.requestFullscreen?.().catch(() => {});
  };

  const live = status === "live";

  return (
    <div ref={shellRef} style={{ background: colors.bg }}>
      {live ? (
        <div style={{ position: "relative", background: "#000", borderRadius: isFullscreen ? 0 : 16, overflow: "hidden" }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={!wantAudio}
            style={{ width: "100%", height: isFullscreen ? "100vh" : "auto", maxHeight: "78vh", objectFit: "contain", display: "block" }}
          />
          <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              {isFullscreen ? "Exit" : "Project fullscreen"}
            </Button>
            {!isFullscreen && (
              <Button variant="danger" size="sm" onClick={onBack}>
                <X size={14} />
                Stop
              </Button>
            )}
          </div>
          <div style={{ position: "absolute", top: 12, left: 12, display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, background: "rgba(22,163,74,0.9)", color: "#fff", fontFamily: fonts.ui, fontSize: 11, fontWeight: 800, letterSpacing: 0.4 }}>
            <Wifi size={12} /> RECEIVING
          </div>
        </div>
      ) : (
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
      )}

      {!live && (
        <div style={{ marginTop: 18 }}>
          <Button variant="ghost" size="sm" onClick={onBack}>
            <RotateCcw size={14} />
            Back
          </Button>
        </div>
      )}
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
