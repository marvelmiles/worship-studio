import { Wifi, WifiOff } from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import { fade } from "../../theme/uiTheme";
import type { PeerStatus } from "./lib/peerStatus";

export type StreamBadgeStatus =
  | "waiting"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "live"
  | "liveOnDisplay";

type BadgeTone = "neutral" | "success" | "warning" | "danger";

const BADGE_CONFIG: Record<
  StreamBadgeStatus,
  { label: string; tone: BadgeTone }
> = {
  waiting: { label: "Waiting", tone: "neutral" },
  connecting: { label: "Connecting", tone: "neutral" },
  connected: { label: "Connected", tone: "success" },
  reconnecting: { label: "Reconnecting", tone: "warning" },
  disconnected: { label: "Disconnected", tone: "danger" },
  live: { label: "Live", tone: "danger" },
  liveOnDisplay: { label: "Live on display", tone: "danger" },
};

export const connectionBadgeStatus = (
  status: PeerStatus,
  isProjecting: boolean,
): StreamBadgeStatus => {
  switch (status) {
    case "failed":
      return "disconnected";
    case "reconnecting":
      return "reconnecting";
    case "live":
      return isProjecting ? "liveOnDisplay" : "connected";
    default:
      return "connecting";
  }
};

interface StreamStatusBadgeProps {
  status: StreamBadgeStatus;
  label?: string;
  size?: "sm" | "md";
}

export const StreamStatusBadge = ({
  status,
  label,
  size = "md",
}: StreamStatusBadgeProps) => {
  const { colors, fonts } = useUITheme();
  const config = BADGE_CONFIG[status];
  const isSmall = size === "sm";
  const solidByTone: Record<BadgeTone, string | undefined> = {
    neutral: undefined,
    success: fade(colors.success, 0.9),
    warning: fade(colors.warning, 0.92),
    danger: fade(colors.danger, 0.92),
  };
  const solidBackground = solidByTone[config.tone];
  const Icon = status === "disconnected" ? WifiOff : Wifi;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: isSmall ? 4 : 6,
        padding: isSmall ? "3px 8px" : "5px 11px",
        borderRadius: 999,
        background: solidBackground ?? colors.raise,
        color: solidBackground ? colors.onAccent : colors.sub,
        border: solidBackground ? "none" : `1px solid ${colors.border}`,
        fontFamily: fonts.ui,
        fontSize: isSmall ? 10 : 11,
        fontWeight: 800,
        letterSpacing: 0.4,
        whiteSpace: "nowrap",
      }}
    >
      <Icon size={isSmall ? 11 : 12} /> {label ?? config.label}
    </span>
  );
};
