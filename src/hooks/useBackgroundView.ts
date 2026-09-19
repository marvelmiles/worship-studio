import type { Slide, SlideDeckDoc, Theme } from "../types";
import { useStore } from "../store/useStore";
import { resolveBackgroundView } from "../lib/resolve";
import type { ResolvedBackground } from "../lib/resolve";
import type { BgMap } from "./useBgMap";

/**
 * The background a slide shows, with the picture or clip settings this document
 * or slide has of its own rather than the ones saved in the library.
 */
export const useBackgroundView = (
  slide: Slide | undefined,
  doc: SlideDeckDoc | undefined,
  theme: Theme,
  bgMap: BgMap,
): ResolvedBackground => {
  const media = useStore((s) => s.media);
  const background = resolveBackgroundView(slide, doc, theme, bgMap);
  const item = background.background.mediaId
    ? media.find((entry) => entry.id === background.background.mediaId)
    : undefined;
  return item
    ? resolveBackgroundView(slide, doc, theme, bgMap, item)
    : background;
};
