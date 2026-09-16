import type { StreamBadgeStatus } from "../StreamStatusBadge";
import type { ConnectionPhase } from "../lib/useConnectionLifecycle";

export type BroadcastPhase =
  "starting" | "waiting" | "connecting" | "live" | "reconnecting" | "failed";

export const broadcastPhaseBadge = (
  phase: BroadcastPhase,
  isViewerLive: boolean,
): StreamBadgeStatus => {
  switch (phase) {
    case "connecting":
      return "connecting";
    case "live":
      return isViewerLive ? "liveOnDisplay" : "connected";
    case "reconnecting":
      return "reconnecting";
    case "failed":
      return "disconnected";
    default:
      return "waiting";
  }
};

export const connectionPhaseBadge = (
  phase: ConnectionPhase,
  isViewerLive: boolean,
): StreamBadgeStatus => {
  switch (phase) {
    case "connected":
      return isViewerLive ? "liveOnDisplay" : "connected";
    case "reconnecting":
      return "reconnecting";
    case "disconnected":
      return "disconnected";
    default:
      return "waiting";
  }
};
