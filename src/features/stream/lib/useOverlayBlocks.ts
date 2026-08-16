import { useMemo } from "react";
import type { Slide, SlideFrame } from "../../../types";
import { SLIDE_ASPECT } from "../../../lib/slideMedia";
import { splitLinesIntoBlocks } from "../../../lib/textBlocks";
import { useDeck } from "../../presentation/useDeck";
import {
  badgeBlockHeight,
  charsPerBlockLine,
  type OverlayBadgeStyle,
  type OverlayBlockStyle,
} from "./overlayAppearance";
import type { ContentOverlay } from "./streamOverlay";

/** One screenful of a passage or manuscript, as the broadcast lays it out. */
export interface OverlayBlock {
  /** The verse reference or section name riding above the words. */
  badge: string;
  lines: string[];
}

/**
 * How many characters this frame can hold at this style before the words would
 * run past its edges.
 *
 * The box is measured in its own width units, the same ones the panel's font
 * size and padding are in, so the whole calculation is a ratio and holds at
 * every size the broadcast is painted at. The broadcast box is taken as 16:9,
 * which is what a camera delivers and what every output here is shaped to.
 */
export function overlayBlockBudget(
  frame: SlideFrame,
  block: OverlayBlockStyle,
  badge: OverlayBadgeStyle,
): number {
  const boxHeight =
    (frame.height / Math.max(frame.width, 1)) * (100 / SLIDE_ASPECT);
  const textHeight = boxHeight - block.padding * 2 - badgeBlockHeight(badge);
  const lineHeight = Math.max(0.5, block.fontSize * block.lineHeight);
  const lines = Math.max(1, Math.floor(textHeight / lineHeight));
  return lines * charsPerBlockLine(block);
}

/**
 * Scripture slides carry their reference as a last line of their own (see
 * buildScriptureSlides, which marks it with a line override). The badge shows
 * that same reference far more clearly, so the line is dropped rather than
 * printed twice.
 */
function bodyLines(slide: Slide, badged: boolean): string[] {
  const lines = slide.lines ?? [];
  const lastIndex = lines.length - 1;
  const hasReferenceLine =
    slide.type === "scripture" &&
    lastIndex >= 0 &&
    slide.lineOverrides?.[lastIndex] !== undefined;
  return hasReferenceLine && badged ? lines.slice(0, lastIndex) : lines;
}

/**
 * Lays a passage or manuscript out as blocks that fit the overlay's frame.
 *
 * A projector gives a slide the whole screen; an overlay gives it a band over a
 * live camera, and the same slide that reads well full-screen is a cropped wall
 * of text in a band. So the document's slides are re-broken here against the
 * frame the operator actually drew: as many blocks as the words need, each one
 * comfortably inside its panel, paged through with the controls exactly as
 * slides are.
 *
 * Re-splitting on every change to the frame or the type settings is deliberate.
 * Dragging a passage overlay shorter does not crop it, it gives it more blocks.
 */
export function useOverlayBlocks(overlay: ContentOverlay): OverlayBlock[] {
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
}
