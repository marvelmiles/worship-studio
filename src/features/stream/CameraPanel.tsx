import {
  MonitorPlay,
  PictureInPicture2,
  Smartphone,
  Unplug,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { PipCorner } from "../../types";
import { useUITheme } from "../../theme/ThemeProvider";
import { fade } from "../../theme/uiTheme";
import { useStore } from "../../store/useStore";
import { Button } from "../../components/ui/Button";
import { IconButton } from "../../components/ui/Button";
import { PipPlacementControls } from "../../components/ui/PipPlacementControls";
import { StreamStatusBadge, connectionBadgeStatus } from "./StreamStatusBadge";
import { AudioSharingPill } from "./AudioSharingPill";
import {
  disconnectStreamCamera,
  hideCameraSecondary,
  MAX_STREAM_CAMERAS,
  MAX_STREAM_SECONDARIES,
  setCameraMuted,
  setCameraPlacement,
  setPrimaryCamera,
  showCameraAsSecondary,
  useStreamSession,
  type StreamCamera,
  type StreamSessionState,
} from "./lib/streamSession";

interface CameraPanelProps {
  /** Whether the feed is on the external display, for the status wording. */
  isLive?: boolean;
}

/**
 * The joined cameras and what each one is doing: which fills the screen, which
 * sit in the corners, and which are connected but off screen waiting to be cut
 * to.
 *
 * All three are one list rather than three, because during a service the
 * question is never "which list is this device in", it is "put that camera on
 * the screen". Every row therefore carries the same controls, and the state a
 * camera is in only changes which of them are lit.
 */
export function CameraPanel({ isLive = false }: CameraPanelProps) {
  const { colors, fonts } = useUITheme();
  const session = useStreamSession();
  const pushToast = useStore((s) => s.pushToast);

  if (session.cameras.length === 0) return null;

  const cornersInUse = session.secondaryIds.flatMap((id) => {
    const camera = session.cameras.find((entry) => entry.deviceId === id);
    return camera ? [camera.placement.corner] : [];
  });

  const handleShowInCorner = (camera: StreamCamera) => {
    if (showCameraAsSecondary(camera.deviceId)) return;
    pushToast(
      `Only ${MAX_STREAM_SECONDARIES} cameras can sit in the corners at once. Take one off first.`,
      "error",
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span
          style={{
            fontFamily: fonts.display,
            fontSize: 15,
            fontWeight: 600,
            color: colors.text,
          }}
        >
          Cameras
        </span>
        <span
          style={{
            fontFamily: fonts.ui,
            fontSize: 11.5,
            fontWeight: 700,
            color: colors.dim,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {session.cameras.length} of {MAX_STREAM_CAMERAS}
        </span>
      </div>

      {session.cameras.map((camera) => (
        <CameraRow
          key={camera.deviceId}
          camera={camera}
          session={session}
          isLive={isLive}
          cornersInUse={cornersInUse}
          onShowInCorner={() => handleShowInCorner(camera)}
        />
      ))}
    </div>
  );
}

function CameraRow({
  camera,
  session,
  isLive,
  cornersInUse,
  onShowInCorner,
}: {
  camera: StreamCamera;
  session: StreamSessionState;
  isLive: boolean;
  cornersInUse: PipCorner[];
  onShowInCorner: () => void;
}) {
  const { colors, fonts } = useUITheme();
  const isPrimary = session.primaryId === camera.deviceId;
  const slot = session.secondaryIds.indexOf(camera.deviceId);
  const isSecondary = slot >= 0;
  const role = isPrimary
    ? "Main screen"
    : isSecondary
      ? `Corner ${slot + 1}`
      : "Off screen";

  return (
    <div
      style={{
        padding: "11px 12px",
        borderRadius: 12,
        background: colors.bg,
        border: `1px solid ${isPrimary ? fade(colors.accent, 0.45) : colors.border}`,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            display: "grid",
            placeItems: "center",
            background: colors.raise,
            color: isPrimary ? colors.accentSoft : colors.sub,
            flexShrink: 0,
          }}
        >
          <Smartphone size={16} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span
            className="ws-ellipsis"
            style={{
              display: "block",
              fontFamily: fonts.ui,
              fontSize: 13.5,
              fontWeight: 700,
              color: colors.text,
            }}
          >
            {camera.deviceName}
          </span>
          <span
            style={{
              fontFamily: fonts.ui,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.4,
              textTransform: "uppercase",
              color: isPrimary ? colors.accentSoft : colors.dim,
            }}
          >
            {role}
          </span>
        </span>
        <StreamStatusBadge
          status={connectionBadgeStatus(camera.status, isPrimary && isLive)}
          size="sm"
        />
      </div>

      <div
        className="ws-row-wrap"
        style={{ display: "flex", alignItems: "center", gap: 7 }}
      >
        {!isPrimary && (
          <Button
            variant="primary"
            size="sm"
            disabled={camera.status === "failed"}
            onClick={() => setPrimaryCamera(camera.deviceId)}
            title={
              camera.status === "failed"
                ? "This camera has stopped sharing"
                : "Show this camera on the main screen"
            }
          >
            <MonitorPlay size={14} />
            Main screen
          </Button>
        )}
        {!isPrimary &&
          (isSecondary ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => hideCameraSecondary(camera.deviceId)}
              title="Take this camera off the picture, keeping it connected"
            >
              <PictureInPicture2 size={14} />
              Take off corner
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={onShowInCorner}
              title="Show this camera in a corner of the picture"
            >
              <PictureInPicture2 size={14} />
              Show in corner
            </Button>
          ))}
        <span style={{ flex: 1 }} />
        <AudioSharingPill
          available={camera.audioShared}
          muted={isPrimary ? false : camera.muted}
          size="sm"
        />
        {/* The main screen's sound is the whole feed's, and is switched at the
            track rather than at one element, so it stays with the header's own
            control (see useRemoteAudio). What is offered here is the corner
            window's, which is a separate decision and normally silence. */}
        {camera.audioShared && !isPrimary && (
          <IconButton
            icon={camera.muted ? VolumeX : Volume2}
            size="sm"
            filled
            active={camera.muted}
            title={
              camera.muted
                ? "Let this corner window be heard"
                : "Silence this corner window"
            }
            onClick={() => setCameraMuted(camera.deviceId, !camera.muted)}
          />
        )}
        <IconButton
          icon={Unplug}
          size="sm"
          filled
          danger
          title="Disconnect this camera"
          onClick={() => disconnectStreamCamera(camera.deviceId)}
        />
      </div>

      {isSecondary && (
        <PipPlacementControls
          placement={camera.placement}
          takenCorners={cornersInUse}
          onChange={(patch) => setCameraPlacement(camera.deviceId, patch)}
        />
      )}
    </div>
  );
}
