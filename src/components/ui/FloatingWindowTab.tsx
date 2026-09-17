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

const LONG = 46;
const SHORT = 22;

/** The chevron points back into the page, the way the window will travel. */
const ARROW: Record<FloatingWindowEdge, LucideIcon> = {
  left: ChevronRight,
  right: ChevronLeft,
  top: ChevronDown,
  bottom: ChevronUp,
};

interface FloatingWindowTabProps {
  stash: FloatingWindowStash;
  label: string;
  zIndex?: number;
}

export const FloatingWindowTab = ({
  stash,
  label,
  zIndex,
}: FloatingWindowTabProps) => {
  const { colors, shadows } = useUITheme();
  const { edge, offset, restore } = stash;
  if (!edge) return null;

  const vertical = edge === "left" || edge === "right";
  const length = vertical ? LONG : SHORT;
  const breadth = vertical ? SHORT : LONG;
  const limit = vertical ? window.innerHeight : window.innerWidth;
  const along = Math.max(8, Math.min(limit - length - 8, offset));
  const Arrow = ARROW[edge];

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={restore}
      style={{
        position: "fixed",
        zIndex,
        width: vertical ? breadth : length,
        height: vertical ? length : breadth,
        ...(vertical ? { top: along } : { left: along }),
        ...(edge === "left" ? { left: 0 } : {}),
        ...(edge === "right" ? { right: 0 } : {}),
        ...(edge === "top" ? { top: 0 } : {}),
        ...(edge === "bottom" ? { bottom: 0 } : {}),
        display: "grid",
        placeItems: "center",
        padding: 0,
        cursor: "pointer",
        background: colors.panelSolid,
        color: colors.sub,
        border: `1px solid ${colors.border}`,
        borderRadius:
          edge === "left"
            ? "0 10px 10px 0"
            : edge === "right"
              ? "10px 0 0 10px"
              : edge === "top"
                ? "0 0 10px 10px"
                : "10px 10px 0 0",
        boxShadow: shadows.overlay,
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.color = colors.text;
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.color = colors.sub;
      }}
    >
      <Arrow size={15} />
    </button>
  );
};
