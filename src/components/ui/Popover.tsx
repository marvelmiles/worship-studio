import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { computePlacement, PLACEMENT_EDGE } from "../../lib/placement";
import type { Placement, PopoverAlign, PopoverSide } from "../../lib/placement";

export type { PopoverAlign, PopoverSide };

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
        align,
      ),
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
      if (
        anchorRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      )
        return;
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
              maxHeight: `calc(100vh - ${PLACEMENT_EDGE * 2}px)`,
              overflowY: "auto",
            }}
          >
            {children}
          </div>,
          document.body,
        )}
    </>
  );
}
