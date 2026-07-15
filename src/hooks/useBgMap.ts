import { useMemo } from "react";
import type { Background } from "../types";
import { useStore } from "../store/useStore";

/** Memoized id → background lookup for the whole background library. */
export function useBgMap(): Record<string, Background> {
  const backgrounds = useStore((s) => s.backgrounds);
  return useMemo(() => {
    const map: Record<string, Background> = {};
    for (const bg of backgrounds) map[bg.id] = bg;
    return map;
  }, [backgrounds]);
}
