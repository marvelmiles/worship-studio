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
import { useFloatingWindow } from "../../hooks/useFloatingWindow";
import { AudioSharingPill } from "./AudioSharingPill";
import { CameraStatusOverlay } from "./components/CameraStatusOverlay";
import { FloatingIconButton } from "./components/FloatingIconButton";
import { StreamStatusBadge, connectionBadgeStatus } from "./StreamStatusBadge";
import { StreamOverlayEditor } from "./StreamOverlayEditor";
import { StreamOverlayLayers } from "./StreamOverlayLayers";
import { StreamPipLayer, cameraPipWindow } from "./StreamPipLayer";
import { StreamVideo } from "./StreamVideo";
import { isPeerConnecting } from "./lib/peerStatus";
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
import { useRemoteAudio } from "./lib/useRemoteAudio";
import { useStreamGoLive } from "./lib/useStreamGoLive";

const PIP_WIDTH = 300;
const PIP_MARGIN = 16;
const FALLBACK_CAMERA_NAME = "Phone camera";

export const StreamPip = () => {
  const { colors, fonts, stage, shadows } = useUITheme();
  const session = useStreamSession();
  const { isLive, toggleLive } = useStreamGoLive();
  const primary = primaryCamera(session);
  const audio = useRemoteAudio(primary?.stream ?? null);
  const overlays = useStreamOverlays();
  const selectedOverlayId = useSelectedStreamOverlayId();
  const rootRef = useRef<HTMLDivElement>(null);
  const { position, handleProps } = useFloatingWindow({
    width: PIP_WIDTH,
    margin: PIP_MARGIN,
    estimatedHeight: 220,
    elementRef: rootRef,
  });

  const cameras = session.cameras;
  const primaryIndex = cameras.findIndex(
    (camera) => camera.deviceId === session.primaryId,
  );
  const nextCamera =
    cameras.length > 1 ? cameras[(primaryIndex + 1) % cameras.length] : null;
  const primaryStatus = primary?.status ?? "connecting";
  const isAwaitingConnection =
    isPeerConnecting(primaryStatus) || !primary?.stream;

  return (
    <div
      ref={rootRef}
      role="region"
      aria-label="Floating camera"
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        width: PIP_WIDTH,
        zIndex: 200,
        borderRadius: 14,
        overflow: "hidden",
        background: colors.panelSolid,
        border: `1px solid ${colors.border}`,
        boxShadow: shadows.overlay,
      }}
    >
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
          {primary?.deviceName || FALLBACK_CAMERA_NAME}
        </span>
        <AudioSharingPill
          available={Boolean(primary?.audioShared)}
          muted={audio.muted}
          size="sm"
        />
        {isLive && <StreamStatusBadge status="live" size="sm" />}
      </div>

      <div
        style={{
          position: "relative",
          aspectRatio: "16 / 9",
          background: stage.surface,
        }}
      >
        <StreamVideo stream={primary?.stream ?? null} muted={isLive} />
        <StreamPipLayer
          windows={secondaryCameras(session).map(cameraPipWindow)}
          forceMuted={isLive}
        />
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
        <CameraStatusOverlay
          status={primaryStatus}
          hasStream={Boolean(primary?.stream)}
          size="compact"
        />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: "8px 9px",
          borderTop: `1px solid ${colors.border}`,
        }}
      >
        <FloatingIconButton
          icon={isLive ? MonitorOff : MonitorUp}
          title={
            isLive
              ? "End live. Close the external display."
              : "Go live on the external display"
          }
          isDanger={isLive}
          disabled={!isLive && isAwaitingConnection}
          onClick={toggleLive}
        />
        {nextCamera && (
          <FloatingIconButton
            icon={SwitchCamera}
            title={`Cut to ${nextCamera.deviceName}`}
            disabled={isAwaitingConnection}
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
            status={connectionBadgeStatus(primaryStatus, isLive)}
            size="sm"
          />
        </span>
        <FloatingIconButton
          icon={Maximize2}
          title="Maximise to the full stream window"
          onClick={() => setStreamMode("stage")}
        />
        <FloatingIconButton
          icon={X}
          title="Stop. Disconnect every camera."
          isDanger
          onClick={endStreamSession}
        />
      </div>
    </div>
  );
};
