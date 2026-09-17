import { WifiOff } from "lucide-react";
import { useUITheme } from "../../../theme/ThemeProvider";
import { fade } from "../../../theme/uiTheme";
import { Spinner } from "../../../components/ui/Spinner";
import { isPeerConnecting, type PeerStatus } from "../lib/peerStatus";

interface CameraStatusOverlayProps {
  status: PeerStatus;
  hasStream: boolean;
  size?: "stage" | "compact";
}

interface OverlayCopy {
  title: string;
  detail: string;
  isBusy: boolean;
  isBlocking: boolean;
}

const overlayCopy = (
  status: PeerStatus,
  hasStream: boolean,
): OverlayCopy | null => {
  if (status === "failed") {
    return {
      title: "The camera disconnected",
      detail: "Open Cameras to switch, or press Stop.",
      isBusy: false,
      isBlocking: true,
    };
  }
  if (status === "reconnecting") {
    return {
      title: "Reconnecting to the camera",
      detail: "The sharing device went quiet. It resumes when it wakes.",
      isBusy: true,
      isBlocking: false,
    };
  }
  if (isPeerConnecting(status) || !hasStream) {
    return {
      title: "Waiting for the camera to connect",
      detail: "Keep the sharing device open and on the same WiFi.",
      isBusy: true,
      isBlocking: true,
    };
  }
  return null;
};

export const CameraStatusOverlay = ({
  status,
  hasStream,
  size = "stage",
}: CameraStatusOverlayProps) => {
  const { fonts, stage } = useUITheme();
  const copy = overlayCopy(status, hasStream);
  if (!copy) return null;
  const isCompact = size === "compact";

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        textAlign: "center",
        padding: isCompact ? 10 : 24,
        background: fade(stage.surface, copy.isBlocking ? 0.72 : 0.4),
        pointerEvents: copy.isBlocking && !isCompact ? "auto" : "none",
        zIndex: 5,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: isCompact ? 6 : 12,
        }}
      >
        {copy.isBusy ? (
          <Spinner size={isCompact ? 18 : 34} />
        ) : (
          <WifiOff size={isCompact ? 18 : 30} color={stage.text} />
        )}
        <div
          style={{
            fontFamily: isCompact ? fonts.ui : fonts.display,
            fontSize: isCompact ? 12 : 18,
            fontWeight: isCompact ? 600 : 700,
            color: stage.text,
          }}
        >
          {copy.title}
        </div>
        {!isCompact && (
          <div
            style={{
              fontFamily: fonts.ui,
              fontSize: 13.5,
              color: fade(stage.text, 0.7),
            }}
          >
            {copy.detail}
          </div>
        )}
      </div>
    </div>
  );
};
