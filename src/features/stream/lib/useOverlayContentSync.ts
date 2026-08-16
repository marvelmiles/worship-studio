import { useEffect, useMemo, useRef } from "react";
import { useStore } from "../../../store/useStore";
import { isContentOverlay, type StreamOverlay } from "./streamOverlay";

/**
 * Keeps a projection window's library in step with the overlays it is asked to
 * show.
 *
 * The popup reads its store from storage once, when it opens. The overlays
 * arrive later and independently, over a BroadcastChannel that carries only the
 * placement and the id of what to show — so an operator who saves a passage and
 * puts it on the broadcast is pointing the popup at a document its copy of the
 * library has never seen. Rather than mirror whole documents down the channel,
 * the popup notices it can't resolve an id and re-reads storage, which the
 * operator has already written to.
 *
 * The request is keyed by exactly which ids are missing, so a document that is
 * genuinely deleted is asked for once rather than in a loop, and the key is
 * released after a moment so a read that raced the operator's write is retried.
 */
export function useOverlayContentSync(overlays: StreamOverlay[]): void {
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
}
