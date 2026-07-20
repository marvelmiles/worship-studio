import { useEffect, useRef, useState } from "react";
import {
  Maximize2,
  Minimize2,
  MonitorPlay,
  MonitorX,
  Wifi,
  X,
} from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import { useStore } from "../../store/useStore";
import { useGoLive } from "../../hooks/useGoLive";
import { Button } from "../../components/ui/Button";
import { streamLiveWindow, setLiveStream } from "./lib/streamLive";

/**
 * The live video the laptop projects. Shared by both pairing paths (one-tap and
 * QR) so the "go fullscreen / go live / stop" surface behaves identically
 * however the connection was made. Attaching the stream re-runs whenever the
 * element (re)mounts, so the picture never lands on a video tag that isn't
 * there yet.
 *
 * "Go live" opens a separate projection window on the external display, reusing
 * the same live-window machinery as the slide presentation (see streamLive.ts).
 * "Project fullscreen" instead fills this window in place — useful when the app
 * itself is already on the projector.
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
  const pushToast = useStore((s) => s.pushToast);
  const { isLive, isExtended, goLive, endLive } = useGoLive(streamLiveWindow);
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

  // Keep the projection window pointed at the current stream while it's live.
  useEffect(() => {
    if (isLive) setLiveStream(stream);
  }, [stream, isLive]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // If the connection stops (this surface unmounts), close the projected window
  // too — the stream it was showing is gone.
  useEffect(() => {
    return () => {
      if (streamLiveWindow.getState().isLive) streamLiveWindow.endLive();
      setLiveStream(null);
    };
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen?.();
    else void shellRef.current?.requestFullscreen?.().catch(() => {});
  };

  // window.open must run inside this click, so this stays synchronous.
  const handleGoLive = () => {
    if (isLive) {
      endLive();
      setLiveStream(null);
      pushToast("Ended the live projection.");
      return;
    }
    setLiveStream(stream);
    const result = goLive();
    if (result.ok) {
      pushToast(
        isExtended
          ? "Live on the external display."
          : "Projection window opened. Drag it to your projector, then press its fullscreen button.",
      );
    } else if (result.reason === "blocked") {
      pushToast(
        "Popup blocked. Allow popups for this site to go live.",
        "error",
      );
    }
  };

  // While projecting to the external window, mute this preview so the room
  // doesn't hear the phone's audio twice.
  const previewMuted = !wantAudio || isLive;

  return (
    <div
      ref={shellRef}
      style={{
        position: "relative",
        background: "#000",
        borderRadius: isFullscreen ? 0 : 16,
        overflow: "hidden",
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={previewMuted}
        style={{
          width: "100%",
          height: isFullscreen ? "100vh" : "auto",
          maxHeight: "78vh",
          objectFit: "contain",
          display: "block",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          display: "flex",
          gap: 8,
        }}
      >
        <Button variant="ghost" size="sm" onClick={toggleFullscreen}>
          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          {isFullscreen ? "Exit" : "Project fullscreen"}
        </Button>
        <Button
          variant={isLive ? "danger" : "primary"}
          size="sm"
          onClick={handleGoLive}
        >
          {isLive ? <MonitorX size={14} /> : <MonitorPlay size={14} />}
          {isLive ? "End live" : "Go live"}
        </Button>
        {!isFullscreen && (
          <Button variant="danger" size="sm" onClick={onStop}>
            <X size={14} />
            Stop
          </Button>
        )}
      </div>
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 10px",
          borderRadius: 999,
          background: isLive ? "rgba(220,38,38,0.92)" : "rgba(22,163,74,0.9)",
          color: "#fff",
          fontFamily: fonts.ui,
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: 0.4,
        }}
      >
        <Wifi size={12} /> {isLive ? "LIVE ON PROJECTOR" : "RECEIVING"}
      </div>
    </div>
  );
}
