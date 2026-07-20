import { useEffect, useRef, useState } from "react";
import { RotateCcw, SwitchCamera, Wifi } from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import { useStore } from "../../store/useStore";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { createSender, type PeerStatus, type SenderHandle } from "./lib/peer";
import { decodeSignal, encodeSignal } from "./lib/streamSignal";
import { ShowCode, ReadCode } from "./CodeExchange";

type Phase = "read-invite" | "streaming";

/**
 * Phone side. Reads the laptop's invite, opens the camera, and shows the reply
 * for the laptop to read back. Once connected the camera keeps streaming while
 * a local preview confirms what the audience is seeing.
 */
export function SenderPanel({ wantAudio, onBack }: { wantAudio: boolean; onBack: () => void }) {
  const { colors, fonts } = useUITheme();
  const pushToast = useStore((s) => s.pushToast);
  const [phase, setPhase] = useState<Phase>("read-invite");
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [handle, setHandle] = useState<SenderHandle | null>(null);
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState<PeerStatus>("idle");
  const offerRef = useRef<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);

  // Open the camera and build the reply once we have the laptop's offer.
  const startStreaming = async (offerSdp: string, useFacing: "environment" | "user") => {
    offerRef.current = offerSdp;
    setPhase("streaming");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: useFacing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: wantAudio,
      });
      const sender = await createSender({ offerSdp, stream, onStatus: setStatus });
      setHandle(sender);
      setReply(encodeSignal("answer", sender.reply));
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      pushToast("Couldn't open the camera. Allow camera access and try again.", "error");
      setPhase("read-invite");
    }
  };

  const applyInvite = (text: string) => {
    const parsed = decodeSignal(text);
    if (!parsed || parsed.kind !== "offer") {
      pushToast("That doesn't look like an invite code from the laptop.", "error");
      return;
    }
    void startStreaming(parsed.sdp, facing);
  };

  const flipCamera = async () => {
    const next = facing === "environment" ? "user" : "environment";
    if (!handle) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: next, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      // Swaps the track on the existing connection, so the live link is kept.
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
        <div style={{ background: colors.raise, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 18, maxWidth: 420, margin: "0 auto" }}>
          <div style={{ fontFamily: fonts.display, fontSize: 17, fontWeight: 600, color: colors.text, marginBottom: 4 }}>
            Point your phone at the laptop
          </div>
          <p style={{ fontFamily: fonts.ui, fontSize: 13, color: colors.sub, margin: "0 0 14px", lineHeight: 1.5 }}>
            On the laptop, open Stream → Display here. Scan the code it shows, or paste it.
          </p>
          <ReadCode scanFacing="environment" scanLabel="Aim at the code on the laptop screen." onCode={applyInvite} />
        </div>
        <div style={{ marginTop: 18, textAlign: "center" }}>
          <Button variant="ghost" size="sm" onClick={onBack}>
            <RotateCcw size={14} />
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 22, alignItems: "start" }}>
      <div style={{ background: colors.raise, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 18 }}>
        <div style={{ fontFamily: fonts.display, fontSize: 16, fontWeight: 600, color: colors.text, marginBottom: 12 }}>
          Show this reply to the laptop
        </div>
        {reply ? (
          <ShowCode value={reply} caption="On the laptop, scan or paste this to finish connecting." />
        ) : (
          <div style={{ padding: 24, display: "grid", placeItems: "center" }}>
            <Spinner size={20} />
          </div>
        )}
      </div>

      <div style={{ background: colors.raise, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontFamily: fonts.display, fontSize: 16, fontWeight: 600, color: colors.text }}>Your camera</span>
          {live && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 999, background: "rgba(22,163,74,0.9)", color: "#fff", fontFamily: fonts.ui, fontSize: 10.5, fontWeight: 800 }}>
              <Wifi size={11} /> LIVE
            </span>
          )}
        </div>
        <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", background: "#000", aspectRatio: "16/9" }}>
          <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontFamily: fonts.ui, fontSize: 13, color: colors.sub }}>
            <Spinner size={14} /> Waiting for the laptop to finish connecting…
          </div>
        )}
        {status === "failed" && (
          <p style={{ fontFamily: fonts.ui, fontSize: 13, color: colors.danger, marginTop: 12 }}>
            Connection failed. Go back and exchange the codes again.
          </p>
        )}
      </div>
    </div>
  );
}
