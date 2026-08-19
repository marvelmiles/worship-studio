import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

/** How long a deep-linked item keeps the ring drawing the eye to it. */
export const ATTENTION_MS = 3000;

/** Frames to keep looking for a target that has not been rendered yet. */
const MAX_LOOKUPS = 30;

/** Marks the element a deep link points at, so `useAttention` can find it. */
export const attentionAttribute = (id: string) => ({ "data-attention-id": id });

/** The class that draws the ring. Pair it with `attentionAttribute`. */
export const ATTENTION_CLASS = "ws-attention";

/**
 * Brings the item a deep link points at into view and rings it for a moment.
 *
 * Opening the asset library from an activity lands on a grid of dozens of
 * swatches that all look alike, so the one that was clicked is scrolled to and
 * outlined; the outline clears itself, because a ring left on screen stops
 * meaning "this one" and starts meaning "selected".
 *
 * Returns the id currently being pointed at, or null.
 */
export function useAttention(
  targetId: string | null,
  containerRef?: RefObject<HTMLElement | null>,
): string | null {
  const [found, setFound] = useState<string | null>(null);
  const timer = useRef<number>();

  useEffect(() => {
    if (!targetId) return;
    let frame = 0;
    let lookups = 0;
    // The modal the target lives in mounts and lays itself out over the next
    // few frames, so the lookup retries rather than giving up on the first miss.
    const find = () => {
      const root: ParentNode = containerRef?.current ?? document;
      const element = root.querySelector(
        `[data-attention-id="${CSS.escape(targetId)}"]`,
      );
      if (element) {
        element.scrollIntoView({ block: "center", behavior: "smooth" });
        setFound(targetId);
        timer.current = window.setTimeout(() => setFound(null), ATTENTION_MS);
        return;
      }
      if (++lookups < MAX_LOOKUPS) frame = requestAnimationFrame(find);
    };
    frame = requestAnimationFrame(find);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer.current);
    };
  }, [targetId, containerRef]);

  // A target that has moved on takes its ring with it, without a second render
  // pass spent clearing what the last one left behind.
  return found === targetId ? found : null;
}
