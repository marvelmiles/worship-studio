import { useEffect, useState } from "react";
import { EMPTY_LIVE_COMPOSITION, type LiveComposition } from "./streamLive";

/**
 * The cameras a projection popup should show, read by reference from the window
 * that opened it.
 *
 * Polled rather than subscribed. A cross-window subscription means the operator
 * window holds a callback that lives inside the popup, and a popup closed the
 * way projection windows actually get closed (the X on a second monitor, mid
 * service) leaves that callback pointing at a dead document. A poll costs
 * nothing and cannot outlive either side; the version stamp on the bridge means
 * it does no work while nothing is moving.
 */

const POLL_MS = 400;

interface BridgeRead {
  version: number;
  composition: LiveComposition;
}

function readBridge(): BridgeRead | null {
  try {
    const opener = window.opener as Window | null;
    const bridge = opener?.__wsStreamLive;
    if (!bridge) return null;
    return { version: bridge.version, composition: bridge.getComposition() };
  } catch {
    // The opener is gone or is not same-origin; there is nothing to show.
    return null;
  }
}

export function useOpenerLiveComposition(enabled = true): LiveComposition {
  const [composition, setComposition] = useState<LiveComposition>(
    EMPTY_LIVE_COMPOSITION,
  );

  useEffect(() => {
    if (!enabled) {
      setComposition(EMPTY_LIVE_COMPOSITION);
      return;
    }
    let seenVersion = -1;
    const pull = () => {
      const read = readBridge();
      if (!read || read.version === seenVersion) return;
      seenVersion = read.version;
      setComposition(read.composition);
    };
    pull();
    const timer = window.setInterval(pull, POLL_MS);
    return () => window.clearInterval(timer);
  }, [enabled]);

  return composition;
}
