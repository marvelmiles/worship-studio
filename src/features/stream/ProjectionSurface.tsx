import { useEffect, useRef, useState, type ReactNode } from "react";
import { useUITheme } from "../../theme/ThemeProvider";
import { useViewport } from "../../hooks/useViewport";
import { useFullscreen } from "../../hooks/useFullscreen";
import { useViewShortcuts } from "../../hooks/useViewShortcuts";
import { CameraStatusOverlay } from "./components/CameraStatusOverlay";
import { StreamOverlayEditor } from "./StreamOverlayEditor";
import { StreamOverlayLayers } from "./StreamOverlayLayers";
import { StreamPipLayer, type StreamPipWindow } from "./StreamPipLayer";
import { StreamVideo } from "./StreamVideo";
import { useSavedOverlaySync } from "./lib/useSavedOverlaySync";
import { StageDrawerPanel, type StageDrawer } from "./stage/StageDrawerPanel";
import { StageHeader } from "./stage/StageHeader";
import {
  isPeerConnecting,
  isPeerFailed,
  type PeerStatus,
} from "./lib/peerStatus";
import { isOnAir } from "./lib/streamOverlay";
import {
  selectStreamOverlay,
  useSelectedStreamOverlayId,
  useStreamOverlays,
} from "./lib/streamOverlayStore";
import { useRemoteAudio } from "./lib/useRemoteAudio";
import { useStreamGoLive } from "./lib/useStreamGoLive";

const MIN_VIDEO_HEIGHT = 360;

interface ProjectionSurfaceProps {
  stream: MediaStream | null;
  status: PeerStatus;
  deviceName?: string;
  audioShared?: boolean;
  secondaries?: StreamPipWindow[];
  onStop: () => void;
  onPopOut: () => void;
  onLiveChange?: (live: boolean) => void;
  /** Floats above the stage: the surface owns a stacking context, so pop-outs
   *  opened from its drawer have to live inside it to stay visible. */
  children?: ReactNode;
}

export const ProjectionSurface = ({
  stream,
  status,
  deviceName,
  audioShared = false,
  secondaries = [],
  onStop,
  onPopOut,
  onLiveChange,
  children,
}: ProjectionSurfaceProps) => {
  const { colors, stage } = useUITheme();
  const { isLive, toggleLive } = useStreamGoLive();
  const audio = useRemoteAudio(stream);
  const { isTablet } = useViewport();
  const overlays = useStreamOverlays();
  useSavedOverlaySync(overlays);
  const selectedOverlayId = useSelectedStreamOverlayId();
  const shellRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(shellRef);
  const [drawer, setDrawer] = useState<StageDrawer>("none");

  const isAwaitingConnection = isPeerConnecting(status) || !stream;
  const isDisconnected = isPeerFailed(status);
  const visibleDrawer = isAwaitingConnection ? "none" : drawer;
  const onAirCount = overlays.filter(isOnAir).length;

  useEffect(() => {
    onLiveChange?.(isLive);
  }, [isLive, onLiveChange]);

  useViewShortcuts({
    onTogglePopOut: onPopOut,
    onToggleFullscreen: toggleFullscreen,
  });

  const toggleDrawer = (panel: Exclude<StageDrawer, "none">) =>
    setDrawer((openPanel) => (openPanel === panel ? "none" : panel));

  return (
    <div
      ref={shellRef}
      style={{
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
      <StageHeader
        status={status}
        deviceName={deviceName}
        isAwaitingConnection={isAwaitingConnection}
        isDisconnected={isDisconnected}
        isLive={isLive}
        isFullscreen={isFullscreen}
        audioShared={audioShared}
        isAudioMuted={audio.muted}
        secondaryCount={secondaries.length}
        onAirCount={onAirCount}
        drawer={visibleDrawer}
        onToggleAudio={audio.toggleMuted}
        onToggleDrawer={toggleDrawer}
        onToggleFullscreen={toggleFullscreen}
        onPopOut={onPopOut}
        onToggleLive={toggleLive}
        onStop={onStop}
      />

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
            background: stage.surface,
          }}
        >
          <StreamVideo stream={stream} muted={isLive} />
          <StreamPipLayer
            windows={secondaries}
            showLabels
            forceMuted={isLive}
          />
          {/* The operator's copy shows drafts too; the room's projection only ever receives on-air overlays. */}
          <StreamOverlayLayers
            overlays={overlays}
            live
            muted={isLive}
            showDrafts
            preview
          />
          {!isAwaitingConnection && (
            <StreamOverlayEditor
              overlays={overlays}
              selectedId={selectedOverlayId}
              onSelect={selectStreamOverlay}
            />
          )}
          <CameraStatusOverlay status={status} hasStream={Boolean(stream)} />
        </div>

        {visibleDrawer !== "none" && (
          <StageDrawerPanel
            drawer={visibleDrawer}
            isStacked={isTablet}
            isLive={isLive}
            overlays={overlays}
            selectedOverlayId={selectedOverlayId}
            onSelectOverlay={selectStreamOverlay}
          />
        )}
      </div>

      {children}
    </div>
  );
};
