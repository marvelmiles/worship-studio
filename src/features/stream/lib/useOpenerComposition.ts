import { useEffect, useState } from "react";
import { EMPTY_LIVE_COMPOSITION, type LiveComposition } from "./streamLive";

const POLL_MS = 400;

interface BridgeRead {
  version: number;
  composition: LiveComposition;
}

const readBridge = (): BridgeRead | null => {
  try {
    const opener = window.opener as Window | null;
    const bridge = opener?.__wsStreamLive;
    if (!bridge) return null;
    return { version: bridge.version, composition: bridge.getComposition() };
  } catch {
    return null;
  }
};

export const useOpenerLiveComposition = (enabled = true): LiveComposition => {
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
};
