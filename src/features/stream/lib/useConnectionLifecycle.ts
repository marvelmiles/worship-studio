import { useEffect, useRef, useState } from "react";
import type { PeerStatus } from "./peer";

/**
 * The connection state a lobby actually shows, distilled from the raw peer
 * status:
 *
 *  - `waiting`      — not connected yet. A failure here means the other device
 *                     simply hasn't finished joining (e.g. it hasn't scanned the
 *                     reply), so we keep waiting rather than cry "disconnected".
 *  - `connected`    — the link is live.
 *  - `disconnected` — it was live and has since dropped.
 */
export type ConnectionPhase = "waiting" | "connected" | "disconnected";

/**
 * Tracks a peer connection's lifecycle from its raw status so the sender and
 * receiver behave identically on stop/disconnect regardless of how they paired.
 *
 * The crucial distinction is "never connected yet" vs "was connected, now
 * dropped": only the latter is a real disconnect. `onDisconnected` fires once,
 * on that transition, so the caller can reset itself to a fresh lobby — and a
 * pre-connection failure is reported as `waiting`, never `disconnected`, so a
 * sender still showing its QR keeps waiting instead of tearing it down.
 */
export function useConnectionLifecycle(
  status: PeerStatus,
  onDisconnected?: () => void,
): ConnectionPhase {
  const [wasLive, setWasLive] = useState(false);
  const firedRef = useRef(false);
  const callbackRef = useRef(onDisconnected);
  callbackRef.current = onDisconnected;

  useEffect(() => {
    if (status === "live") setWasLive(true);
  }, [status]);

  useEffect(() => {
    if (wasLive && status === "failed" && !firedRef.current) {
      firedRef.current = true;
      callbackRef.current?.();
    }
  }, [wasLive, status]);

  if (status === "live") return "connected";
  if (wasLive && status === "failed") return "disconnected";
  return "waiting";
}
