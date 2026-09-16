import { useMemo } from "react";
import type { Background } from "../types";
import { useStore } from "../store/useStore";

export type BgMap = Record<string, Background>;

export const useBgMap = (): BgMap => {
  const backgrounds = useStore((s) => s.backgrounds);
  return useMemo(() => {
    const map: BgMap = {};
    for (const bg of backgrounds) map[bg.id] = bg;
    return map;
  }, [backgrounds]);
};
