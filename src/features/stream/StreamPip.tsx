import { useRef } from "react";
import {
  GripHorizontal,
  Maximize2,
  MonitorOff,
  MonitorUp,
  SwitchCamera,
  X,
} from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import { useStore } from "../../store/useStore";
import { useFloatingWindow } from "../../hooks/useFloatingWindow";
import { useGoLive } from "../../hooks/useGoLive";
import { StreamStatusBadge, connectionBadgeStatus } from "./StreamStatusBadge";
import { AudioSharingPill } from "./AudioSharingPill";
import { streamLiveWindow } from "./lib/streamLive";
import { useRemoteAudio } from "./lib/useRemoteAudio";
import { StreamOverlayLayers } from "./StreamOverlayLayers";
import { StreamOverlayEditor } from "./StreamOverlayEditor";
import { StreamPipLayer, cameraPipWindow } from "./StreamPipLayer";
import { StreamVideo } from "./StreamVideo";
import {
  selectStreamOverlay,
  useSelectedStreamOverlayId,
  useStreamOverlays,
} from "./lib/streamOverlayStore";
import {
  endStreamSession,
  primaryCamera,
  secondaryCameras,
  setPrimaryCamera,
  setStreamMode,
  useStreamSession,
} from "./lib/streamSession";

const WIDTH = 300;
const MARGIN = 16;

/**
 * The stream's floating, draggable Picture-in-Picture: the same idea as the
 * presentation's PresenterPip, but for the live cameras. It's rendered at the
 * app root from the shared session, so it stays put while the operator moves
 * around the app. From here they can cut between the joined cameras, go live /
 * end live, maximise back to the full stage, or stop everything. If the last
 * device drops, the session ends and this window disappears with it.
 */
export function StreamPip() {
  const { colors, fonts } = useUITheme();
  const pushToast = useStore((s) => s.pushToast);
  const session = useStreamSession();
  const { isLive, isExtended, goLive, endLive } = useGoLive(streamLiveWindow);
  const primary = primaryCamera(session);
  const audio = useRemoteAudio(primary?.stream ?? null);
  const overlays = useStreamOverlays();
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedOverlayId = useSelectedStreamOverlayId();
  const { position, handleProps } = useFloatingWindow({
    width: WIDTH,
    margin: MARGIN,
    estimatedHeight: 220,
    elementRef: rootRef,
  });

  const handleGoLive = () => {
    if (isLive) {
      endLive();
      pushToast("Ended the live projection.");
      return;
    }
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

  // Cutting to the next camera from a window this small is one control, not a
  // roster: the full arrangement lives on the maximised stage. Whichever camera
  // comes next in the joined order takes the screen, and the one leaving it
  // keeps whatever place it already had.
  const order = session.cameras;
  const currentIndex = order.findIndex(
    (camera) => camera.deviceId === session.primaryId,
  );
  const nextCamera =
    order.length > 1 ? order[(currentIndex + 1) % order.length] : null;

  const connecting = primary?.status === "connecting";
  const disconnected = primary?.status === "failed";
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
        left: position.x,
        top: position.y,
        width: WIDTH,
        zIndex: 200,
        borderRadius: 14,
        overflow: "hidden",
        // Solid rather than a translucent backdrop-filter panel. At the opacity
        // this used the blur was invisible anyway, and a backdrop filter makes
        // the compositor re-blur the region behind a floating window that sits
        // over a playing video and is dragged around: cost paid every frame,
        // during a service, for nothing on screen.
        background: colors.panelSolid,
        border: `1px solid ${colors.border}`,
        boxShadow: "0 18px 45px rgba(0,0,0,0.5)",
      }}
    >
      {/* Drag handle / title bar. */}
      <div
        {...handleProps}
        style={{
          ...handleProps.style,
          display: "flex",
          alignItems: "center",
          gap: 7,
          padding: "8px 10px",
          borderBottom: `1px solid ${colors.border}`,
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
          {primary?.deviceName || "Phone camera"}
        </span>
        <AudioSharingPill
          available={Boolean(primary?.audioShared)}
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
        <StreamVideo stream={primary?.stream ?? null} muted={previewMuted} />
        <StreamPipLayer
          windows={secondaryCameras(session).map(cameraPipWindow)}
          forceMuted={isLive}
        />
        {/* The overlays at PiP scale, so the operator can see the broadcast
            while working elsewhere in the app. This is their own copy, not the
            room's, so it shows the drafts they are still arranging and the
            changes they have staged but not applied: otherwise an element added
            from the Stream page while the camera is popped out would have
            nothing to look at. Clips stay silent here; the projection carries
            the sound. */}
        <StreamOverlayLayers
          overlays={overlays}
          live
          muted
          showDrafts
          preview
        />
        <StreamOverlayEditor
          overlays={overlays}
          selectedId={selectedOverlayId}
          onSelect={selectStreamOverlay}
        />
        {(connecting || disconnected) && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              background: disconnected ? "rgba(0,0,0,0.55)" : "transparent",
              // Never in the way of an overlay being placed underneath it.
              pointerEvents: "none",
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
        {nextCamera && (
          <MiniButton
            icon={SwitchCamera}
            title={`Cut to ${nextCamera.deviceName}`}
            onClick={() => setPrimaryCamera(nextCamera.deviceId)}
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
            status={connectionBadgeStatus(
              primary?.status ?? "connecting",
              isLive,
            )}
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
          title="Stop. Disconnect every camera."
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
