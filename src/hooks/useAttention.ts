import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

export const ATTENTION_MS = 3000;

const MAX_LOOKUPS = 30;

export const attentionAttribute = (id: string) => ({ "data-attention-id": id });

export const ATTENTION_CLASS = "ws-attention";

export const useAttention = (
  targetId: string | null,
  containerRef?: RefObject<HTMLElement | null>,
): string | null => {
  const [found, setFound] = useState<string | null>(null);
  const timer = useRef<number>();

  useEffect(() => {
    if (!targetId) return;
    let frame = 0;
    let lookups = 0;
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

  return found === targetId ? found : null;
};
