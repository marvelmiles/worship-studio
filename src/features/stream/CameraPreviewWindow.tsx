import { useState } from "react";
import {
  GripHorizontal,
  MonitorPlay,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import { useFloatingWindow } from "../../hooks/useFloatingWindow";
import { IconButton } from "../../components/ui/Button";
import { StreamStatusBadge, connectionBadgeStatus } from "./StreamStatusBadge";
import { StreamVideo } from "./StreamVideo";
import { closeCameraPreview, useCameraPreviewIds } from "./lib/cameraPreview";
import {
  findCamera,
  setPrimaryCamera,
  useStreamSession,
  type StreamCamera,
  type StreamSessionState,
} from "./lib/streamSession";

const WIDTH = 268;

/**
 * The floating previews of joined cameras, rendered once at the app root beside
 * the stream's own picture-in-picture.
 *
 * A preview is the operator's own monitor of one device: it is not on the main
 * screen, not in a corner of the broadcast and never reaches the projection. It
 * is what they look at before cutting to a camera, so it can be opened for any
 * device in the roster, dragged anywhere, and left open while they work
 * elsewhere in the app.
 */
export function CameraPreviewWindows() {
  const previewIds = useCameraPreviewIds();
  const session = useStreamSession();

  if (previewIds.length === 0) return null;

  return (
    <>
      {previewIds.map((deviceId, index) => {
        const camera = findCamera(session, deviceId);
        if (!camera) return null;
        return (
          <CameraPreviewWindow
            key={deviceId}
            camera={camera}
            session={session}
            index={index}
          />
        );
      })}
    </>
  );
}

function CameraPreviewWindow({
  camera,
  session,
  index,
}: {
  camera: StreamCamera;
  session: StreamSessionState;
  index: number;
}) {
  const { colors, fonts } = useUITheme();
  const { ref, position, handleProps } = useFloatingWindow({
    width: WIDTH,
    estimatedHeight: 200,
    offsetIndex: index,
  });
  // Silent by default: a preview is opened to see a camera, and several rooms
  // of sound at once is never what the operator reached for.
  const [muted, setMuted] = useState(true);
  const isPrimary = session.primaryId === camera.deviceId;
  const disconnected = camera.status === "failed";

  return (
    <div
      ref={ref}
      role="region"
      aria-label={`Preview of ${camera.deviceName}`}
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        width: WIDTH,
        zIndex: 210,
        borderRadius: 14,
        overflow: "hidden",
        background: colors.panelSolid,
        border: `1px solid ${colors.border}`,
        boxShadow: "0 18px 45px rgba(0,0,0,0.5)",
      }}
    >
      <div
        {...handleProps}
        style={{
          ...handleProps.style,
          display: "flex",
          alignItems: "center",
          gap: 7,
          padding: "7px 9px",
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <GripHorizontal size={14} color={colors.dim} style={{ flexShrink: 0 }} />
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
          {camera.deviceName}
        </span>
        <StreamStatusBadge
          status={connectionBadgeStatus(camera.status, false)}
          size="sm"
        />
      </div>

      <div
        style={{
          position: "relative",
          aspectRatio: "16 / 9",
          background: "#000",
        }}
      >
        <StreamVideo stream={camera.stream} muted={muted} />
        {(disconnected || !camera.stream) && (
          <span
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              background: disconnected ? "rgba(0,0,0,0.55)" : "transparent",
              pointerEvents: "none",
              color: "rgba(255,255,255,0.8)",
              fontFamily: fonts.ui,
              fontSize: 12,
            }}
          >
            {disconnected ? "Disconnected" : "Connecting…"}
          </span>
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "7px 8px",
          borderTop: `1px solid ${colors.border}`,
        }}
      >
        <span
          className="ws-ellipsis"
          style={{
            flex: 1,
            minWidth: 0,
            fontFamily: fonts.ui,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.4,
            textTransform: "uppercase",
            color: isPrimary ? colors.accentSoft : colors.dim,
          }}
        >
          {isPrimary ? "Main screen" : "Preview only"}
        </span>
        {camera.audioShared && (
          <IconButton
            icon={muted ? VolumeX : Volume2}
            size="sm"
            active={muted}
            title={muted ? "Listen to this preview" : "Silence this preview"}
            onClick={() => setMuted(!muted)}
          />
        )}
        {!isPrimary && (
          <IconButton
            icon={MonitorPlay}
            size="sm"
            disabled={disconnected}
            title={
              disconnected
                ? "This camera has stopped sharing"
                : "Cut to this camera on the main screen"
            }
            onClick={() => setPrimaryCamera(camera.deviceId)}
          />
        )}
        <IconButton
          icon={X}
          size="sm"
          title="Close this preview"
          onClick={() => closeCameraPreview(camera.deviceId)}
        />
      </div>
    </div>
  );
}
