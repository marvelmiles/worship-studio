import { useMemo } from "react";
import type { Slide, SlideFrame } from "../../../types";
import { SLIDE_ASPECT } from "../../../lib/slideLayout";
import { splitLinesIntoBlocks } from "../../../lib/textBlocks";
import { useDeck } from "../../presentation/useDeck";
import {
  badgeBlockHeight,
  charsPerBlockLine,
  type OverlayBadgeStyle,
  type OverlayBlockStyle,
} from "./overlayAppearance";
import type { ContentOverlay } from "./streamOverlay";

export interface OverlayBlock {
  badge: string;
  lines: string[];
}

export const overlayBlockBudget = (
  frame: SlideFrame,
  block: OverlayBlockStyle,
  badge: OverlayBadgeStyle,
): number => {
  const boxHeight =
    (frame.height / Math.max(frame.width, 1)) * (100 / SLIDE_ASPECT);
  const textHeight = boxHeight - block.padding * 2 - badgeBlockHeight(badge);
  const lineHeight = Math.max(0.5, block.fontSize * block.lineHeight);
  const lines = Math.max(1, Math.floor(textHeight / lineHeight));
  return lines * charsPerBlockLine(block);
};

const bodyLines = (slide: Slide, badged: boolean): string[] => {
  const lines = slide.lines ?? [];
  const lastIndex = lines.length - 1;
  const hasReferenceLine =
    slide.type === "scripture" &&
    lastIndex >= 0 &&
    slide.lineOverrides?.[lastIndex] !== undefined;
  return hasReferenceLine && badged ? lines.slice(0, lastIndex) : lines;
};

export const useOverlayBlocks = (overlay: ContentOverlay): OverlayBlock[] => {
  const deck = useDeck(overlay.kind, overlay.contentId);
  const { frame, block, badge } = overlay;

  return useMemo(() => {
    if (!deck) return [];
    const budget = overlayBlockBudget(frame, block, badge);
    return deck.slides.flatMap((deckSlide) => {
      if (deckSlide.kind !== "text") return [];
      const label = deckSlide.slide.label ?? "";
      const lines = bodyLines(deckSlide.slide, badge.show).filter(
        (line) => line.trim() !== "",
      );
      if (lines.length === 0) return [];
      return splitLinesIntoBlocks(lines, budget).map((blockLines) => ({
        badge: label,
        lines: blockLines,
      }));
    });
  }, [deck, frame, block, badge]);
};
