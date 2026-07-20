import { Wifi } from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";

/**
 * The one badge used across the stream module for connection status, so the
 * WiFi pill looks and reads the same everywhere. Neutral by default; pass a
 * `label` to override the wording for a specific spot.
 */
export type StreamBadgeStatus =
  | "waiting"
  | "connecting"
  | "receiving"
  | "sharing"
  | "connected"
  | "live"
  | "liveOnDisplay";

const GREEN = "rgba(22,163,74,0.9)";
const RED = "rgba(220,38,38,0.92)";

const CONFIG: Record<StreamBadgeStatus, { label: string; solid?: string }> = {
  waiting: { label: "Waiting" },
  connecting: { label: "Connecting" },
  receiving: { label: "Receiving", solid: GREEN },
  sharing: { label: "Sharing", solid: GREEN },
  connected: { label: "Connected", solid: GREEN },
  live: { label: "Live", solid: RED },
  liveOnDisplay: { label: "Live on display", solid: RED },
};

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
