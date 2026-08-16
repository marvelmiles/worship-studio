import { useEffect, useRef, useState } from "react";
import {
  GripHorizontal,
  Maximize2,
  MonitorOff,
  MonitorUp,
  X,
} from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import { useStore } from "../../store/useStore";
import { useGoLive } from "../../hooks/useGoLive";
import { StreamStatusBadge, connectionBadgeStatus } from "./StreamStatusBadge";
import { AudioSharingPill } from "./AudioSharingPill";
import { streamLiveWindow, setLiveStream } from "./lib/streamLive";
import { useRemoteAudio } from "./lib/useRemoteAudio";
import { StreamOverlayLayers } from "./StreamOverlayLayers";
import { useStreamOverlays } from "./lib/streamOverlayStore";
import {
  endStreamSession,
  setStreamMode,
  useStreamSession,
} from "./lib/streamSession";

const WIDTH = 300;
const MARGIN = 16;

/**
 * The stream's floating, draggable Picture-in-Picture — the same idea as the
 * presentation's PresenterPip, but for the live camera. It's rendered at the
 * app root from the shared session, so it stays put while the operator moves
 * around the app. From here they can go live / end live, maximise back to the
 * full stage, or stop the device entirely. If the device drops, the session
 * ends and this window disappears with it.
 */
export function StreamPip() {
  const { colors, fonts } = useUITheme();
  const pushToast = useStore((s) => s.pushToast);
  const session = useStreamSession();
  const { isLive, isExtended, goLive, endLive } = useGoLive(streamLiveWindow);
  const audio = useRemoteAudio(session.stream);
  const overlays = useStreamOverlays();
  const videoRef = useRef<HTMLVideoElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(() => ({
    x: Math.max(MARGIN, window.innerWidth - WIDTH - MARGIN),
    y: MARGIN,
  }));
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (session.stream && el && el.srcObject !== session.stream) {
      el.srcObject = session.stream;
      void el.play().catch(() => {});
    }
  }, [session.stream]);

  // Keep the external projection pointed at the current stream while live.
  useEffect(() => {
    if (isLive) setLiveStream(session.stream);
  }, [isLive, session.stream]);

  // Keep the window on screen when the viewport shrinks under it.
  useEffect(() => {
    const onResize = () => {
      const height = rootRef.current?.offsetHeight ?? 220;
      setPos((p) => ({
        x: Math.min(p.x, Math.max(MARGIN, window.innerWidth - WIDTH - MARGIN)),
        y: Math.min(
          p.y,
          Math.max(MARGIN, window.innerHeight - height - MARGIN),
        ),
      }));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const startDrag = (e: React.PointerEvent) => {
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onDrag = (e: React.PointerEvent) => {
    const offset = drag.current;
    if (!offset) return;
    const height = rootRef.current?.offsetHeight ?? 220;
    setPos({
      x: Math.max(
        0,
        Math.min(window.innerWidth - WIDTH, e.clientX - offset.dx),
      ),
      y: Math.max(
        0,
        Math.min(window.innerHeight - height, e.clientY - offset.dy),
      ),
    });
  };
  const endDrag = () => {
    drag.current = null;
  };

  const handleGoLive = () => {
    if (isLive) {
      endLive();
      setLiveStream(null);
      pushToast("Ended the live projection.");
      return;
    }
    setLiveStream(session.stream);
    const result = goLive();
    if (result.ok) {
      pushToast(
        isExtended
          ? "Live on the external display."
          : "Projection window opened. Drag it to your display, then press its fullscreen button.",
      );
    } else if (result.reason === "blocked") {
      pushToast(
        "Popup blocked. Allow popups for this site to go live.",
        "error",
      );
    }
  };

  const connecting = session.status === "connecting";
  const disconnected = session.status === "failed";
  // Play the sender's audio in the floating preview, unless the external
  // projection is live and already carrying the sound.
  const previewMuted = isLive;

  return (
    <div
      ref={rootRef}
      role="region"
      aria-label="Floating camera"
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: WIDTH,
        zIndex: 200,
        borderRadius: 14,
        overflow: "hidden",
        // Solid rather than a translucent backdrop-filter panel. At the opacity
        // this used the blur was invisible anyway, and a backdrop filter makes
        // the compositor re-blur the region behind a floating window that sits
        // over a playing video and is dragged around — cost paid every frame,
        // during a service, for nothing on screen.
        background: colors.panelSolid,
        border: `1px solid ${colors.border}`,
        boxShadow: "0 18px 45px rgba(0,0,0,0.5)",
      }}
    >
      {/* Drag handle / title bar. */}
      <div
        onPointerDown={startDrag}
        onPointerMove={onDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          padding: "8px 10px",
          cursor: drag.current ? "grabbing" : "grab",
          borderBottom: `1px solid ${colors.border}`,
          touchAction: "none",
        }}
      >
        <GripHorizontal
          size={14}
          color={colors.dim}
          style={{ flexShrink: 0 }}
        />
        <span
          className="ws-ellipsis"
          style={{
            flex: 1,
            minWidth: 0,
            fontFamily: fonts.ui,
            fontSize: 12.5,
            fontWeight: 700,
            color: colors.text,
          }}
        >
          {session.deviceName || "Phone camera"}
        </span>
        <AudioSharingPill
          available={session.audioShared}
          muted={audio.muted}
          size="sm"
        />
        {isLive && <StreamStatusBadge status="live" size="sm" />}
      </div>

      {/* Camera preview. */}
      <div
        style={{
          position: "relative",
          aspectRatio: "16 / 9",
          background: "#000",
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={previewMuted}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
        {/* The overlays at PiP scale, so the operator can see the broadcast
            while working elsewhere in the app. This is their own copy, not the
            room's, so it also shows the changes they have staged but not
            applied — otherwise adjusting a live element from the Stream page
            would have nothing to look at. Clips stay silent here; the
            projection carries the sound. */}
        <StreamOverlayLayers overlays={overlays} live muted preview />
        {(connecting || disconnected) && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              background: disconnected ? "rgba(0,0,0,0.55)" : "transparent",
              color: "rgba(255,255,255,0.8)",
              fontFamily: fonts.ui,
              fontSize: 12,
            }}
          >
            {disconnected ? "Disconnected" : "Connecting…"}
          </div>
        )}
      </div>

      {/* Controls. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: "8px 9px",
          borderTop: `1px solid ${colors.border}`,
        }}
      >
        {isLive ? (
          <MiniButton
            icon={MonitorOff}
            title="End live. Close the external display."
            danger
            onClick={handleGoLive}
          />
        ) : (
          <MiniButton
            icon={MonitorUp}
            title="Go live on the external display"
            onClick={handleGoLive}
          />
        )}
        <span
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <StreamStatusBadge
            status={connectionBadgeStatus(session.status, isLive)}
            size="sm"
          />
        </span>
        <MiniButton
          icon={Maximize2}
          title="Maximise to the full stream window"
          onClick={() => setStreamMode("stage")}
        />
        <MiniButton
          icon={X}
          title="Stop. Disconnect this device."
          danger
          onClick={endStreamSession}
        />
      </div>
    </div>
  );
}

function MiniButton({
  icon: Icon,
  title,
  onClick,
  danger,
}: {
  icon: typeof Maximize2;
  title: string;
  onClick: () => void;
  danger?: boolean;
}) {
  const { colors } = useUITheme();
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      style={{
        width: 28,
        height: 28,
        flexShrink: 0,
        borderRadius: 8,
        cursor: "pointer",
        display: "grid",
        placeItems: "center",
        background: "transparent",
        color: danger ? colors.danger : colors.sub,
        border: "1px solid transparent",
      }}
    >
      <Icon size={15} />
    </button>
  );
}
