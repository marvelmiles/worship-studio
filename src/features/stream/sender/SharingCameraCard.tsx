import type { ReactNode, RefObject } from "react";
import { Radio, SwitchCamera, Volume2, VolumeX, X } from "lucide-react";
import { useUITheme } from "../../../theme/ThemeProvider";
import { Button } from "../../../components/ui/Button";
import { StreamCard, StreamCardTitle } from "../components/StreamCard";
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
  const isFrontCamera = facing === "user";

  return (
    <StreamCard>
      <StreamCardTitle icon={Radio} title="Your camera" trailing={badge} />
      <div
        style={{
          position: "relative",
          borderRadius: 12,
          overflow: "hidden",
          background: stage.surface,
          aspectRatio: "16 / 9",
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>

      {statusLine}

      <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
        <Button
          variant={isAudioOn ? "primary" : "ghost"}
          size="sm"
          onClick={onToggleAudio}
          title={
            isAudioOn
              ? "Audio is shared with the other device. Click to mute."
              : "Include this device's microphone in the stream."
          }
        >
          {isAudioOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
          {isAudioOn ? "Audio on" : "Include audio"}
        </Button>
        {hasMultipleCameras && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onFlip}
            title={
              isFrontCamera
                ? "Switch to the back camera"
                : "Switch to the front camera"
            }
          >
            <SwitchCamera
              size={14}
              style={{ transform: isFrontCamera ? "scaleX(-1)" : undefined }}
            />
            Switch camera
          </Button>
        )}
        <Button variant="danger" size="sm" onClick={onStop}>
          <X size={14} />
          Stop
        </Button>
      </div>
    </StreamCard>
  );
};
