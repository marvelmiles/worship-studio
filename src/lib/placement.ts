/** Viewport placement shared by every floating panel (popovers, toolbars). */

export type PopoverSide = "bottom" | "top" | "left" | "right";
export type PopoverAlign = "start" | "center" | "end";

export const PLACEMENT_GAP = 6;
/** Keeps the panel from touching the very edge of the window. */
export const PLACEMENT_EDGE = 8;

export interface Placement {
  top: number;
  left: number;
  side: PopoverSide;
}

export interface PanelSize {
  width: number;
  height: number;
}

/**
 * Positions `panel` against `anchor` in viewport coordinates, flipping to the
 * opposite side when the preferred one doesn't fit and sliding along the cross
 * axis to stay on screen. Returns the winning position.
 */
export function computePlacement(
  anchor: DOMRect,
  panel: PanelSize,
  preferred: PopoverSide,
  align: PopoverAlign,
): Placement {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const room: Record<PopoverSide, number> = {
    bottom: vh - anchor.bottom - PLACEMENT_GAP,
    top: anchor.top - PLACEMENT_GAP,
    right: vw - anchor.right - PLACEMENT_GAP,
    left: anchor.left - PLACEMENT_GAP,
  };
  const needed = (s: PopoverSide) =>
    s === "top" || s === "bottom" ? panel.height : panel.width;

  // Prefer the requested side, then its opposite, then whichever has the most
  // room. That last step is what saves a panel taller than either gap.
  const opposite: Record<PopoverSide, PopoverSide> = {
    bottom: "top",
    top: "bottom",
    left: "right",
    right: "left",
  };
  let side = preferred;
  if (room[preferred] < needed(preferred)) {
    const flipped = opposite[preferred];
    side =
      room[flipped] >= needed(flipped)
        ? flipped
        : (Object.keys(room) as PopoverSide[]).reduce((a, b) =>
            room[a] - needed(a) >= room[b] - needed(b) ? a : b,
          );
  }

  let top: number;
  let left: number;
  if (side === "bottom" || side === "top") {
    top =
      side === "bottom"
        ? anchor.bottom + PLACEMENT_GAP
        : anchor.top - PLACEMENT_GAP - panel.height;
    left =
      align === "center"
        ? anchor.left + anchor.width / 2 - panel.width / 2
        : align === "end"
          ? anchor.right - panel.width
          : anchor.left;
  } else {
    left =
      side === "right"
        ? anchor.right + PLACEMENT_GAP
        : anchor.left - PLACEMENT_GAP - panel.width;
    top =
      align === "center"
        ? anchor.top + anchor.height / 2 - panel.height / 2
        : align === "end"
          ? anchor.bottom - panel.height
          : anchor.top;
  }

  // Final clamp so a panel bigger than the remaining room still stays visible.
  left = Math.max(
    PLACEMENT_EDGE,
    Math.min(left, vw - panel.width - PLACEMENT_EDGE),
  );
  top = Math.max(
    PLACEMENT_EDGE,
    Math.min(top, vh - panel.height - PLACEMENT_EDGE),
  );
  return { top, left, side };
}
