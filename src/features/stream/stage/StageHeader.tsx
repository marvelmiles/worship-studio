import {
  Layers,
  Maximize2,
  Minimize2,
  MonitorPlay,
  MonitorX,
  PictureInPicture2,
  Video,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useUITheme } from "../../../theme/ThemeProvider";
import { Button } from "../../../components/ui/Button";
import { keepsSelectionProps } from "../../../lib/selectionScope";
import { viewCommandTitle } from "../../../lib/viewCommands";
import { AudioSharingPill } from "../AudioSharingPill";
import { StreamStatusBadge, connectionBadgeStatus } from "../StreamStatusBadge";
import type { PeerStatus } from "../lib/peerStatus";
import type { StageDrawer } from "./StageDrawerPanel";

interface StageHeaderProps {
  status: PeerStatus;
  deviceName?: string;
  isAwaitingConnection: boolean;
  isDisconnected: boolean;
  isLive: boolean;
  isFullscreen: boolean;
  audioShared: boolean;
  isAudioMuted: boolean;
  secondaryCount: number;
  onAirCount: number;
  drawer: StageDrawer;
  onToggleAudio: () => void;
  onToggleDrawer: (drawer: Exclude<StageDrawer, "none">) => void;
  onToggleFullscreen: () => void;
  onPopOut: () => void;
  onToggleLive: () => void;
  onStop: () => void;
}

export const StageHeader = ({
  status,
  deviceName,
  isAwaitingConnection,
  isDisconnected,
  isLive,
  isFullscreen,
  audioShared,
  isAudioMuted,
  secondaryCount,
  onAirCount,
  drawer,
  onToggleAudio,
  onToggleDrawer,
  onToggleFullscreen,
  onPopOut,
  onToggleLive,
  onStop,
}: StageHeaderProps) => {
  const { colors, fonts } = useUITheme();
  const waitingTitle = isAwaitingConnection
    ? "Available once the camera connects"
    : undefined;

  return (
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
        <AudioSharingPill available={audioShared} muted={isAudioMuted} />
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
            variant={isAudioMuted ? "ghost" : "primary"}
            size="sm"
            onClick={onToggleAudio}
            disabled={isAwaitingConnection}
            title={
              waitingTitle ??
              (isAudioMuted
                ? "Unmute the sender's audio"
                : "Mute the sender's audio")
            }
          >
            {isAudioMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            {isAudioMuted ? "Unmute audio" : "Mute audio"}
          </Button>
        )}
        <Button
          variant={drawer === "cameras" ? "primary" : "ghost"}
          size="sm"
          onClick={() => onToggleDrawer("cameras")}
          disabled={isAwaitingConnection}
          title={
            waitingTitle ??
            "Choose which camera fills the screen and which sit in the corners"
          }
        >
          <Video size={14} />
          {secondaryCount > 0 ? `Cameras (+${secondaryCount})` : "Cameras"}
        </Button>
        <span {...keepsSelectionProps} style={{ display: "inline-flex" }}>
          <Button
            variant={drawer === "overlays" ? "primary" : "ghost"}
            size="sm"
            onClick={() => onToggleDrawer("overlays")}
            disabled={isAwaitingConnection}
            title={
              waitingTitle ??
              "Passages, manuscripts, pictures, clips and announcements over the camera"
            }
          >
            <Layers size={14} />
            {onAirCount > 0 ? `Overlays (${onAirCount} on air)` : "Overlays"}
          </Button>
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleFullscreen}
          title={viewCommandTitle(
            isFullscreen ? "Exit fullscreen" : "Project fullscreen",
            "fullscreen",
          )}
        >
          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          {isFullscreen ? "Exit fullscreen" : "Project fullscreen"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onPopOut}
          title={viewCommandTitle(
            "Shrink the stage into the floating window and keep using the app",
            "popOut",
          )}
        >
          <PictureInPicture2 size={14} />
          Pop out
        </Button>
        <Button
          variant={isLive ? "danger" : "primary"}
          size="sm"
          onClick={onToggleLive}
          disabled={!isLive && (isAwaitingConnection || isDisconnected)}
          title={waitingTitle}
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
  );
};
