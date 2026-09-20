import { useRef, type ReactNode, type RefObject } from "react";
import {
  Maximize2,
  Minimize2,
  Radio,
  SwitchCamera,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useUITheme } from "../../../theme/ThemeProvider";
import { useAutoHideChrome } from "../../../hooks/useAutoHideChrome";
import { useFullscreen } from "../../../hooks/useFullscreen";
import { Button, StageButton } from "../../../components/ui/Button";
import { Panel, PanelTitle } from "../../../components/ui/Panel";
import type { FacingMode } from "../lib/cameras";

interface SharingCameraCardProps {
  videoRef: RefObject<HTMLVideoElement>;
  badge?: ReactNode;
  statusLine?: ReactNode;
  isAudioOn: boolean;
  onToggleAudio: () => void;
  facing: FacingMode;
  hasMultipleCameras: boolean;
  onFlip: () => void;
  onStop: () => void;
}

const audioTitle = (isAudioOn: boolean): string =>
  isAudioOn
    ? "Audio is shared with the other device. Click to mute."
    : "Include this device's microphone in the stream.";

const flipTitle = (isFrontCamera: boolean): string =>
  isFrontCamera ? "Switch to the back camera" : "Switch to the front camera";

export const SharingCameraCard = ({
  videoRef,
  badge,
  statusLine,
  isAudioOn,
  onToggleAudio,
  facing,
  hasMultipleCameras,
  onFlip,
  onStop,
}: SharingCameraCardProps) => {
  const { stage } = useUITheme();
  const shellRef = useRef<HTMLDivElement>(null);
  const {
    isFullscreen,
    fillStyle,
    toggle: toggleFullscreen,
  } = useFullscreen(shellRef);
  /* Nothing but the camera should be on screen while it is filling it, so the
     controls step aside and come back on a touch, a click or a moved pointer. */
  const chrome = useAutoHideChrome({ enabled: isFullscreen });
  const isFrontCamera = facing === "user";

  /* The chrome is hidden rather than unmounted so the camera element survives
     the switch: a remounted video would lose the stream it is showing. */
  return (
    <div
      ref={shellRef}
      style={
        isFullscreen
          ? {
              display: "flex",
              width: "100%",
              height: "100%",
              background: "#000",
              ...(fillStyle ?? {}),
            }
          : undefined
      }
    >
      <Panel
        style={
          isFullscreen
            ? {
                flex: 1,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                padding: 0,
                border: "none",
                borderRadius: 0,
                background: "#000",
              }
            : undefined
        }
      >
        {!isFullscreen && (
          <PanelTitle icon={Radio} title="Your camera" trailing={badge} />
        )}
        <div
          onPointerDown={chrome.wake}
          onPointerMove={chrome.wake}
          style={{
            position: "relative",
            overflow: "hidden",
            background: isFullscreen ? "#000" : stage.surface,
            ...(isFullscreen
              ? { flex: 1, minHeight: 0 }
              : { borderRadius: 12, aspectRatio: "16 / 9" }),
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: isFullscreen ? "contain" : "cover",
              display: "block",
            }}
          />
          {isFullscreen && (
            <div
              onPointerEnter={() => chrome.onHoverChange(true)}
              onPointerLeave={() => chrome.onHoverChange(false)}
              style={{
                position: "absolute",
                left: "50%",
                bottom: 22,
                transform: "translateX(-50%)",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 12px",
                borderRadius: 16,
                background: stage.overlayStrong,
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                border: `1px solid ${stage.border}`,
                boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
                opacity: chrome.visible ? 1 : 0,
                pointerEvents: chrome.visible ? "auto" : "none",
                transition: "opacity 0.3s ease",
              }}
            >
              <StageButton
                icon={isAudioOn ? Volume2 : VolumeX}
                title={audioTitle(isAudioOn)}
                active={isAudioOn}
                solid
                onClick={onToggleAudio}
              />
              {hasMultipleCameras && (
                <StageButton
                  icon={SwitchCamera}
                  title={flipTitle(isFrontCamera)}
                  solid
                  onClick={onFlip}
                />
              )}
              <StageButton
                icon={Minimize2}
                title="Leave full screen"
                solid
                onClick={toggleFullscreen}
              />
            </div>
          )}
        </div>

        {!isFullscreen && statusLine}

        {!isFullscreen && (
          <div
            style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}
          >
            <Button
              variant={isAudioOn ? "primary" : "ghost"}
              size="sm"
              onClick={onToggleAudio}
              title={audioTitle(isAudioOn)}
            >
              {isAudioOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
              {isAudioOn ? "Audio on" : "Include audio"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              title="Fill this screen with the camera, the way the other device shows it"
            >
              <Maximize2 size={14} />
              Full screen
            </Button>
            {hasMultipleCameras && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onFlip}
                title={flipTitle(isFrontCamera)}
              >
                <SwitchCamera
                  size={14}
                  style={{
                    transform: isFrontCamera ? "scaleX(-1)" : undefined,
                  }}
                />
                Switch camera
              </Button>
            )}
            <Button variant="danger" size="sm" onClick={onStop}>
              <X size={14} />
              Stop
            </Button>
          </div>
        )}
      </Panel>
    </div>
  );
};
