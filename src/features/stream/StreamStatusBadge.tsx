import { Wifi } from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import type { PeerStatus } from "./lib/peer";

/**
 * The one badge used across the stream module for connection status, so the
 * WiFi pill looks and reads the same everywhere. Neutral by default; pass a
 * `label` to override the wording for a specific spot.
 */
export type StreamBadgeStatus =
  | "waiting"
  | "connecting"
  | "connected"
  | "disconnected"
  | "live"
  | "liveOnDisplay";

const GREEN = "rgba(22,163,74,0.9)";
const RED = "rgba(220,38,38,0.92)";

const CONFIG: Record<StreamBadgeStatus, { label: string; solid?: string }> = {
  waiting: { label: "Waiting" },
  connecting: { label: "Connecting" },
  connected: { label: "Connected", solid: GREEN },
  disconnected: { label: "Disconnected", solid: RED },
  live: { label: "Live", solid: RED },
  liveOnDisplay: { label: "Live on display", solid: RED },
};

/**
 * Maps a live peer-connection status to the badge that describes it, so every
 * surface in the module reports the same real-time state. `projecting` promotes a
 * connected feed to "live on display" when it's on the external projection window.
 */
export function connectionBadgeStatus(status: PeerStatus, projecting: boolean): StreamBadgeStatus {
  switch (status) {
    case "failed":
      return "disconnected";
    case "live":
      return projecting ? "liveOnDisplay" : "connected";
    default:
      return "connecting";
  }
}

export function StreamStatusBadge({
  status,
  label,
  size = "md",
}: {
  status: StreamBadgeStatus;
  label?: string;
  size?: "sm" | "md";
}) {
  const { colors, fonts } = useUITheme();
  const cfg = CONFIG[status];
  const small = size === "sm";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: small ? 4 : 6,
        padding: small ? "3px 8px" : "5px 11px",
        borderRadius: 999,
        background: cfg.solid ?? colors.raise,
        color: cfg.solid ? "#fff" : colors.sub,
        border: cfg.solid ? "none" : `1px solid ${colors.border}`,
        fontFamily: fonts.ui,
        fontSize: small ? 10 : 11,
        fontWeight: 800,
        letterSpacing: 0.4,
        whiteSpace: "nowrap",
      }}
    >
      <Wifi size={small ? 11 : 12} /> {label ?? cfg.label}
    </span>
  );
}
