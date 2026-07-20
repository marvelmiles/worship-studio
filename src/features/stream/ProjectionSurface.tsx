import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Wifi, X } from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import { Button } from "../../components/ui/Button";

/**
 * The live video the laptop projects. Shared by both pairing paths (one-tap and
 * QR) so the "go fullscreen onto the projector / stop" surface behaves
 * identically however the connection was made. Attaching the stream re-runs
 * whenever the element (re)mounts, so the picture never lands on a video tag
 * that isn't there yet.
 */
export function ProjectionSurface({
  stream,
  wantAudio,
  onStop,
}: {
  stream: MediaStream | null;
  wantAudio: boolean;
  onStop: () => void;
}) {
  const { fonts } = useUITheme();
  const videoRef = useRef<HTMLVideoElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (stream && el && el.srcObject !== stream) {
      el.srcObject = stream;
      void el.play().catch(() => {});
    }
  }, [stream]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen?.();
    else void shellRef.current?.requestFullscreen?.().catch(() => {});
  };

  return (
    <div ref={shellRef} style={{ position: "relative", background: "#000", borderRadius: isFullscreen ? 0 : 16, overflow: "hidden" }}>
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
          <Button variant="danger" size="sm" onClick={onStop}>
            <X size={14} />
            Stop
          </Button>
        )}
      </div>
      <div style={{ position: "absolute", top: 12, left: 12, display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, background: "rgba(22,163,74,0.9)", color: "#fff", fontFamily: fonts.ui, fontSize: 11, fontWeight: 800, letterSpacing: 0.4 }}>
        <Wifi size={12} /> RECEIVING
      </div>
    </div>
  );
}
