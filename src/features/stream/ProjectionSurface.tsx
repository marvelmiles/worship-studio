import { useEffect, useRef, useState } from "react";
import {
  Layers,
  Maximize2,
  Minimize2,
  MonitorPlay,
  MonitorX,
  PictureInPicture2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import { useStore } from "../../store/useStore";
import { useGoLive } from "../../hooks/useGoLive";
import { useViewport } from "../../hooks/useViewport";
import { Button } from "../../components/ui/Button";
import { StreamStatusBadge, connectionBadgeStatus } from "./StreamStatusBadge";
import { streamLiveWindow, setLiveStream } from "./lib/streamLive";
import { useRemoteAudio } from "./lib/useRemoteAudio";
import { AudioSharingPill } from "./AudioSharingPill";
import { StreamOverlayLayers } from "./StreamOverlayLayers";
import { StreamOverlayEditor } from "./StreamOverlayEditor";
import { StreamOverlayPanel } from "./StreamOverlayPanel";
import { useStreamOverlays } from "./lib/streamOverlayStore";
import { isOnAir } from "./lib/streamOverlay";
import type { PeerStatus } from "./lib/peer";

/** Video never shrinks below this, so a short viewport scrolls instead. */
const MIN_VIDEO_HEIGHT = 360;

/** Wide enough for the overlay list and its settings without wrapping. */
const OVERLAY_DRAWER_WIDTH = 330;

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
  status,
  deviceName,
  audioShared = false,
  onStop,
  onPopOut,
  onLiveChange,
}: {
  stream: MediaStream | null;
  status: PeerStatus;
  deviceName?: string;
  /** Whether the sender is currently sharing its microphone (signalled by the sender). */
  audioShared?: boolean;
  onStop: () => void;
  onPopOut?: () => void;
  /** Reports whether the feed is live on the external display, so the sender can reflect it. */
  onLiveChange?: (live: boolean) => void;
}) {
  const { colors, fonts } = useUITheme();
  const pushToast = useStore((s) => s.pushToast);
  const { isLive, isExtended, goLive, endLive } = useGoLive(streamLiveWindow);
  const audio = useRemoteAudio(stream);
  const { isTablet } = useViewport();
  const overlays = useStreamOverlays();
  const videoRef = useRef<HTMLVideoElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [overlaysOpen, setOverlaysOpen] = useState(false);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(
    null,
  );
  const disconnected = status === "failed";
  // The count that matters is what the room can see, not what is staged.
  const onAirCount = overlays.filter(isOnAir).length;

  // Tell the sender whenever the projection goes live on (or leaves) the display.
  useEffect(() => {
    onLiveChange?.(isLive);
  }, [isLive, onLiveChange]);

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
      pushToast(
        "Popup blocked. Allow popups for this site to go live.",
        "error",
      );
    }
  };

  // Play the sender's audio here while it's shown in-app. When projecting to
  // the external window, mute this copy so the room doesn't hear it twice — the
  // external window carries the sound.
  const previewMuted = isLive;

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
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            minWidth: 0,
            flexWrap: "wrap",
          }}
        >
          <StreamStatusBadge status={connectionBadgeStatus(status, isLive)} />
          <AudioSharingPill available={audioShared} muted={audio.muted} />
          {deviceName && (
            <span
              className="ws-ellipsis"
              style={{
                fontFamily: fonts.ui,
                fontSize: 13,
                fontWeight: 600,
                color: colors.text,
                minWidth: 0,
              }}
            >
              {deviceName}
            </span>
          )}
        </span>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {audioShared && (
            <Button
              variant={audio.muted ? "ghost" : "primary"}
              size="sm"
              onClick={audio.toggleMuted}
              title={
                audio.muted
                  ? "Unmute the sender's audio"
                  : "Mute the sender's audio"
              }
            >
              {audio.muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              {audio.muted ? "Unmute audio" : "Mute audio"}
            </Button>
          )}
          <Button
            variant={overlaysOpen ? "primary" : "ghost"}
            size="sm"
            onClick={() => setOverlaysOpen((open) => !open)}
            title="Show passages, manuscripts, pictures, clips and announcements over the camera"
          >
            <Layers size={14} />
            {onAirCount > 0 ? `Overlays (${onAirCount} on air)` : "Overlays"}
          </Button>
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
          <Button
            variant={isLive ? "danger" : "primary"}
            size="sm"
            onClick={handleGoLive}
            disabled={disconnected && !isLive}
          >
            {isLive ? <MonitorX size={14} /> : <MonitorPlay size={14} />}
            {isLive ? "End live" : "Go live"}
          </Button>
          <Button variant="danger" size="sm" onClick={onStop}>
            <X size={14} />
            Stop
          </Button>
        </div>
      </div>

      {/* Video and, when open, the overlay drawer beside it. They stack on a
          narrow screen so the drawer never squeezes the camera to a sliver. */}
      <div
        style={{
          display: "flex",
          flexDirection: isTablet ? "column" : "row",
          flex: 1,
          minHeight: 0,
          alignItems: "stretch",
        }}
      >
        <div
          style={{
            position: "relative",
            flex: 1,
            minHeight: MIN_VIDEO_HEIGHT,
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
          {/* Drafts and handles appear only while the drawer is open. With it
              closed this surface is a program monitor and shows exactly what
              the room is seeing; with it open it is the arranging surface. */}
          <StreamOverlayLayers
            overlays={overlays}
            live
            muted={isLive}
            showDrafts={overlaysOpen}
          />
          {overlaysOpen && (
            <StreamOverlayEditor
              overlays={overlays}
              selectedId={selectedOverlayId}
              onSelect={setSelectedOverlayId}
            />
          )}
          {disconnected && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
                textAlign: "center",
                padding: 24,
                background: "rgba(0,0,0,0.55)",
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: fonts.display,
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#fff",
                    marginBottom: 6,
                  }}
                >
                  The camera disconnected
                </div>
                <div
                  style={{
                    fontFamily: fonts.ui,
                    fontSize: 13.5,
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  Press Stop to close this view, then reconnect from the device
                  list.
                </div>
              </div>
            </div>
          )}
        </div>

        {overlaysOpen && (
          <aside
            aria-label="Broadcast overlays"
            style={{
              flexShrink: 0,
              width: isTablet ? "auto" : OVERLAY_DRAWER_WIDTH,
              maxHeight: isTablet ? "45dvh" : undefined,
              overflowY: "auto",
              padding: 14,
              background: colors.raise,
              ...(isTablet
                ? { borderTop: `1px solid ${colors.border}` }
                : { borderLeft: `1px solid ${colors.border}` }),
            }}
          >
            <StreamOverlayPanel
              overlays={overlays}
              selectedId={selectedOverlayId}
              onSelect={setSelectedOverlayId}
            />
          </aside>
        )}
      </div>
    </div>
  );
}
