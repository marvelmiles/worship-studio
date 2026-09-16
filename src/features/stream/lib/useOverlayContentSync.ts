import { useEffect, useMemo, useRef } from "react";
import { useStore } from "../../../store/useStore";
import { isContentOverlay, type StreamOverlay } from "./streamOverlay";

export const useOverlayContentSync = (overlays: StreamOverlay[]): void => {
  const scriptures = useStore((s) => s.scriptures);
  const manuscripts = useStore((s) => s.manuscripts);
  const media = useStore((s) => s.media);
  const load = useStore((s) => s.load);
  const requestedKey = useRef("");

  const missingKey = useMemo(() => {
    const known: Record<string, Set<string>> = {
      scripture: new Set(scriptures.map((doc) => doc.id)),
      manuscript: new Set(manuscripts.map((doc) => doc.id)),
      image: new Set(media.map((item) => item.id)),
      video: new Set(media.map((item) => item.id)),
    };
    return overlays
      .filter(isContentOverlay)
      .filter((overlay) => !known[overlay.kind]?.has(overlay.contentId))
      .map((overlay) => `${overlay.kind}:${overlay.contentId}`)
      .sort()
      .join("|");
  }, [overlays, scriptures, manuscripts, media]);

  useEffect(() => {
    if (!missingKey || requestedKey.current === missingKey) return;
    requestedKey.current = missingKey;
    void load();
    const retry = window.setTimeout(() => {
      if (requestedKey.current === missingKey) requestedKey.current = "";
    }, 1500);
    return () => window.clearTimeout(retry);
  }, [missingKey, load]);
};
