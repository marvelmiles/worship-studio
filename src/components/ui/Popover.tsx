import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type PopoverSide = "bottom" | "top" | "left" | "right";
export type PopoverAlign = "start" | "center" | "end";

const GAP = 6;
/** Keeps the panel from touching the very edge of the window. */
const EDGE = 8;

interface Placement {
  top: number;
  left: number;
  side: PopoverSide;
}

/**
 * Positions `panel` against `trigger` in viewport coordinates, flipping to the
 * opposite side when the preferred one doesn't fit and sliding along the cross
 * axis to stay on screen. Returns the winning position.
 */
function computePlacement(
  trigger: DOMRect,
  panel: { width: number; height: number },
  preferred: PopoverSide,
  align: PopoverAlign
): Placement {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const room: Record<PopoverSide, number> = {
    bottom: vh - trigger.bottom - GAP,
    top: trigger.top - GAP,
    right: vw - trigger.right - GAP,
    left: trigger.left - GAP,
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
            room[a] - needed(a) >= room[b] - needed(b) ? a : b
          );
  }

  let top: number;
  let left: number;
  if (side === "bottom" || side === "top") {
    top = side === "bottom" ? trigger.bottom + GAP : trigger.top - GAP - panel.height;
    left =
      align === "center"
        ? trigger.left + trigger.width / 2 - panel.width / 2
        : align === "end"
          ? trigger.right - panel.width
          : trigger.left;
  } else {
    left = side === "right" ? trigger.right + GAP : trigger.left - GAP - panel.width;
    top =
      align === "center"
        ? trigger.top + trigger.height / 2 - panel.height / 2
        : align === "end"
          ? trigger.bottom - panel.height
          : trigger.top;
  }

  // Final clamp so a panel bigger than the remaining room still stays visible.
  left = Math.max(EDGE, Math.min(left, vw - panel.width - EDGE));
  top = Math.max(EDGE, Math.min(top, vh - panel.height - EDGE));
  return { top, left, side };
}

interface PopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The control the panel is anchored to. */
  trigger: ReactNode;
  children: ReactNode;
  side?: PopoverSide;
  align?: PopoverAlign;
  /** Opens on pointer hover as well as click, with a small close delay. */
  openOnHover?: boolean;
  disabled?: boolean;
  /** Applied to the inline-flex wrapper around the trigger. */
  triggerStyle?: React.CSSProperties;
}

/**
 * A popover that cannot be clipped by its container.
 *
 * Panels rendered inside cards used to disappear: `.ws-card` sets
 * `overflow: hidden`, so an absolutely-positioned menu was cut off at the card
 * edge. This renders into a portal on `document.body` and positions itself in
 * viewport coordinates instead, then flips and clamps so it is always fully
 * on screen no matter where the trigger sits.
 */
export function Popover({
  open,
  onOpenChange,
  trigger,
  children,
  side = "bottom",
  align = "start",
  openOnHover,
  disabled,
  triggerStyle,
}: PopoverProps) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number>();
  const [placement, setPlacement] = useState<Placement | null>(null);

  const reposition = useCallback(() => {
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor || !panel) return;
    setPlacement(
      computePlacement(
        anchor.getBoundingClientRect(),
        { width: panel.offsetWidth, height: panel.offsetHeight },
        side,
        align
      )
    );
  }, [side, align]);

  // Measure before paint so the panel never flashes at the wrong spot.
  useLayoutEffect(() => {
    if (!open) {
      setPlacement(null);
      return;
    }
    reposition();
  }, [open, reposition, children]);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => reposition();
    // Capture phase catches scrolling of any ancestor, not just the window.
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      onOpenChange(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  const cancelClose = () => window.clearTimeout(closeTimer.current);
  const scheduleClose = () => {
    if (!openOnHover) return;
    cancelClose();
    // Grace period so the pointer can cross the gap to the panel.
    closeTimer.current = window.setTimeout(() => onOpenChange(false), 180);
  };
  const hoverOpen = () => {
    if (!openOnHover || disabled) return;
    cancelClose();
    onOpenChange(true);
  };

  return (
    <>
      <span
        ref={anchorRef}
        style={{ display: "inline-flex", ...triggerStyle }}
        onClick={() => !disabled && onOpenChange(!open)}
        onPointerEnter={(e) => {
          // Touch taps also fire pointerenter; let the click handle those.
          if (e.pointerType !== "mouse") return;
          hoverOpen();
        }}
        onPointerLeave={scheduleClose}
      >
        {trigger}
      </span>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            onPointerEnter={cancelClose}
            onPointerLeave={scheduleClose}
            style={{
              position: "fixed",
              top: placement?.top ?? 0,
              left: placement?.left ?? 0,
              zIndex: 400,
              // Hidden until measured, so it never paints mid-flight.
              visibility: placement ? "visible" : "hidden",
              maxHeight: `calc(100vh - ${EDGE * 2}px)`,
              overflowY: "auto",
            }}
          >
            {children}
          </div>,
          document.body
        )}
    </>
  );
}
