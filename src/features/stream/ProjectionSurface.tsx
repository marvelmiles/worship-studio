import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, MonitorPlay, MonitorX, PictureInPicture2, X } from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import { useStore } from "../../store/useStore";
import { useGoLive } from "../../hooks/useGoLive";
import { Button } from "../../components/ui/Button";
import { StreamStatusBadge } from "./StreamStatusBadge";
import { streamLiveWindow, setLiveStream } from "./lib/streamLive";

/** Video never shrinks below this, so a short viewport scrolls instead. */
const MIN_VIDEO_HEIGHT = 360;

/**
 * The full-screen "stage" view of the projected camera. Purely presentational:
 * it renders whatever stream it's given and reports actions upward. For the
 * one-tap flow it's rendered at the app root from the shared session (so it
 * overlays the whole app and survives navigation); the QR flow renders it
 * inline without a pop-out.
 *
 * "Pop out" shrinks it into the floating PiP (via onPopOut). "Go live" opens the
 * external projection window; "Project fullscreen" fills this one in place.
 */
export function ProjectionSurface({
  stream,
  wantAudio,
  deviceName,
  onStop,
  onPopOut,
}: {
  stream: MediaStream | null;
  wantAudio: boolean;
  deviceName?: string;
  onStop: () => void;
  onPopOut?: () => void;
}) {
  const { colors, fonts } = useUITheme();
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
          : "Projection window opened. Drag it to your display, then press its fullscreen button.",
      );
    } else if (result.reason === "blocked") {
      pushToast("Popup blocked. Allow popups for this site to go live.", "error");
    }
  };

  // While projecting to the external window, mute this preview so the room
  // doesn't hear the phone's audio twice.
  const previewMuted = !wantAudio || isLive;

  return (
    <div
      ref={shellRef}
      style={{
        // Full-screen overlay: header + video are exactly one screen tall.
        // 100dvh tracks the mobile browser's UI; it scrolls internally only when
        // it can't fit the min video size.
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "100dvh",
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        background: colors.bg,
        overflowX: "hidden",
        overflowY: "auto",
      }}
    >
      {/* Header: status on the left, controls on the right. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          flexShrink: 0,
          padding: "10px 14px",
          background: colors.raise,
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <StreamStatusBadge status={isLive ? "liveOnDisplay" : "receiving"} />
          {deviceName && (
            <span className="ws-ellipsis" style={{ fontFamily: fonts.ui, fontSize: 13, fontWeight: 600, color: colors.text, minWidth: 0 }}>
              {deviceName}
            </span>
          )}
        </span>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button variant="ghost" size="sm" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            {isFullscreen ? "Exit fullscreen" : "Project fullscreen"}
          </Button>
          {onPopOut && (
            <Button variant="ghost" size="sm" onClick={onPopOut}>
              <PictureInPicture2 size={14} />
              Pop out
            </Button>
          )}
          <Button variant={isLive ? "danger" : "primary"} size="sm" onClick={handleGoLive}>
            {isLive ? <MonitorX size={14} /> : <MonitorPlay size={14} />}
            {isLive ? "End live" : "Go live"}
          </Button>
          <Button variant="danger" size="sm" onClick={onStop}>
            <X size={14} />
            Stop
          </Button>
        </div>
      </div>

      {/* Video: full width, all remaining height, floored at a usable minimum. */}
      <div style={{ flex: 1, minHeight: MIN_VIDEO_HEIGHT, background: "#000" }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={previewMuted}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </div>
    </div>
  );
}
