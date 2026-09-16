import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { computePlacement, PLACEMENT_EDGE } from "../../lib/placement";
import type { Placement, PopoverAlign, PopoverSide } from "../../lib/placement";

export type { PopoverAlign, PopoverSide };

const PANEL_ATTR = "data-popover-panel";

interface PopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  children: ReactNode;
  side?: PopoverSide;
  align?: PopoverAlign;
  openOnHover?: boolean;
  disabled?: boolean;
  triggerStyle?: React.CSSProperties;
}

export const Popover = ({
  open,
  onOpenChange,
  trigger,
  children,
  side = "bottom",
  align = "start",
  openOnHover,
  disabled,
  triggerStyle,
}: PopoverProps) => {
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
      if (target instanceof Element && target.closest(`[${PANEL_ATTR}]`))
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

  const pinned = useRef(false);
  useEffect(() => {
    if (!open) pinned.current = false;
  }, [open]);

  const cancelClose = () => window.clearTimeout(closeTimer.current);
  const scheduleClose = (event: PointerEvent<HTMLElement>) => {
    if (!openOnHover || pinned.current || event.pointerType !== "mouse") return;
    cancelClose();
    closeTimer.current = window.setTimeout(() => onOpenChange(false), 180);
  };
  const hoverOpen = (event: PointerEvent<HTMLElement>) => {
    if (!openOnHover || disabled || event.pointerType !== "mouse") return;
    cancelClose();
    if (!open) onOpenChange(true);
  };
  const handleClick = () => {
    if (disabled) return;
    cancelClose();
    if (open && openOnHover && !pinned.current) {
      pinned.current = true;
      return;
    }
    pinned.current = !open;
    onOpenChange(!open);
  };

  return (
    <>
      <span
        ref={anchorRef}
        style={{ display: "inline-flex", ...triggerStyle }}
        onClick={handleClick}
        onPointerEnter={hoverOpen}
        onPointerLeave={scheduleClose}
      >
        {trigger}
      </span>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            {...{ [PANEL_ATTR]: "" }}
            onPointerEnter={cancelClose}
            onPointerLeave={scheduleClose}
            style={{
              position: "fixed",
              top: placement?.top ?? 0,
              left: placement?.left ?? 0,
              zIndex: 400,
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
};
