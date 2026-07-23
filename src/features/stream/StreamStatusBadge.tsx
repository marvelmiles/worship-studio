import { Wifi } from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import { fade } from "../../theme/uiTheme";
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

const CONFIG: Record<
  StreamBadgeStatus,
  { label: string; tone?: "success" | "danger" }
> = {
  waiting: { label: "Waiting" },
  connecting: { label: "Connecting" },
  connected: { label: "Connected", tone: "success" },
  disconnected: { label: "Disconnected", tone: "danger" },
  live: { label: "Live", tone: "danger" },
  liveOnDisplay: { label: "Live on display", tone: "danger" },
};

/**
 * Maps a live peer-connection status to the badge that describes it, so every
 * surface in the module reports the same real-time state. `projecting` promotes a
 * connected feed to "live on display" when it's on the external projection window.
 */
export function connectionBadgeStatus(
  status: PeerStatus,
  projecting: boolean,
): StreamBadgeStatus {
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
  const solid =
    cfg.tone === "success"
      ? fade(colors.success, 0.9)
      : cfg.tone === "danger"
        ? fade(colors.danger, 0.92)
        : undefined;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: small ? 4 : 6,
        padding: small ? "3px 8px" : "5px 11px",
        borderRadius: 999,
        background: solid ?? colors.raise,
        color: solid ? colors.onAccent : colors.sub,
        border: solid ? "none" : `1px solid ${colors.border}`,
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
