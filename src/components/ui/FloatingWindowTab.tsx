import { useCallback, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import type {
  FloatingWindowEdge,
  FloatingWindowStash,
} from "../../hooks/useFloatingWindow";

const THICKNESS = 26;
const MIN_LENGTH = 64;
const MAX_LENGTH = 168;
const EDGE_GAP = 8;

/** How far the pointer may travel before a press counts as a drag, not a click. */
const DRAG_SLOP = 4;

/** The chevron points back into the page, the way the window will travel. */
const ARROW: Record<FloatingWindowEdge, LucideIcon> = {
  left: ChevronRight,
  right: ChevronLeft,
  top: ChevronDown,
  bottom: ChevronUp,
};

const RADIUS: Record<FloatingWindowEdge, string> = {
  left: "0 10px 10px 0",
  right: "10px 0 0 10px",
  top: "0 0 10px 10px",
  bottom: "10px 10px 0 0",
};

interface FloatingWindowTabProps {
  stash: FloatingWindowStash;
  /** The pop-out module the tab brings back, such as Camera or Manuscript. */
  name: string;
  /** What this particular pop-out is showing, when several share a module. */
  detail?: string;
  zIndex?: number;
}

export const FloatingWindowTab = ({
  stash,
  name,
  detail,
  zIndex,
}: FloatingWindowTabProps) => {
  const { colors, fonts, shadows } = useUITheme();
  const [length, setLength] = useState(MIN_LENGTH);
  const pressOrigin = useRef<{ x: number; y: number } | null>(null);
  const wasDragged = useRef(false);
  const { edge, offset, restore, handleProps } = stash;
  const isVertical = edge === "left" || edge === "right";

  /* The tab sizes itself to its label, and that size is what keeps it from
     running off the end of the edge it is parked on. Remounting on a new edge
     or label, through the key below, is what re-measures it. */
  const measure = useCallback(
    (node: HTMLButtonElement | null) => {
      if (!node) return;
      setLength(isVertical ? node.offsetHeight : node.offsetWidth);
    },
    [isVertical],
  );

  if (!edge) return null;

  const limit = isVertical ? window.innerHeight : window.innerWidth;
  const along = Math.max(EDGE_GAP, Math.min(limit - length - EDGE_GAP, offset));
  const Arrow = ARROW[edge];
  const description = `${name}${detail ? ` (${detail})` : ""}. Click to bring it back, or drag to move it.`;

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    pressOrigin.current = { x: event.clientX, y: event.clientY };
    wasDragged.current = false;
    handleProps.onPointerDown(event);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const origin = pressOrigin.current;
    const travelled = origin
      ? Math.abs(event.clientX - origin.x) + Math.abs(event.clientY - origin.y)
      : 0;
    if (travelled > DRAG_SLOP) wasDragged.current = true;
    handleProps.onPointerMove(event);
  };

  const finishDrag = (end: () => void) => () => {
    pressOrigin.current = null;
    end();
  };

  return (
    <button
      key={`${edge}:${name}`}
      ref={measure}
      type="button"
      title={description}
      aria-label={description}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishDrag(handleProps.onPointerUp)}
      onPointerCancel={finishDrag(handleProps.onPointerCancel)}
      onClick={() => {
        if (!wasDragged.current) restore();
      }}
      style={{
        ...handleProps.style,
        position: "fixed",
        zIndex,
        ...(isVertical
          ? {
              top: along,
              width: THICKNESS,
              minHeight: MIN_LENGTH,
              maxHeight: MAX_LENGTH,
              padding: "9px 0",
            }
          : {
              left: along,
              height: THICKNESS,
              minWidth: MIN_LENGTH,
              maxWidth: MAX_LENGTH,
              padding: "0 9px",
            }),
        ...(edge === "left" ? { left: 0 } : {}),
        ...(edge === "right" ? { right: 0 } : {}),
        ...(edge === "top" ? { top: 0 } : {}),
        ...(edge === "bottom" ? { bottom: 0 } : {}),
        display: "flex",
        flexDirection: isVertical ? "column" : "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        background: colors.panelSolid,
        color: colors.sub,
        border: `1px solid ${colors.border}`,
        borderRadius: RADIUS[edge],
        boxShadow: shadows.overlay,
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.color = colors.text;
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.color = colors.sub;
      }}
    >
      <Arrow size={14} style={{ flexShrink: 0 }} />
      <span
        style={{
          minWidth: 0,
          minHeight: 0,
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          fontFamily: fonts.ui,
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: 0.2,
          lineHeight: 1,
          color: "inherit",
          ...(isVertical ? { writingMode: "vertical-rl" } : {}),
        }}
      >
        {name}
      </span>
    </button>
  );
};
