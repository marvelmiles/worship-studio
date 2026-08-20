import {
  ArrowDownLeft,
  ArrowDownRight,
  ArrowUpLeft,
  ArrowUpRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PipCorner, PipPlacement } from "../../types";
import {
  PIP_CORNER_LABELS,
  PIP_CORNERS,
  PIP_SIZE_MAX,
  PIP_SIZE_MIN,
} from "../../lib/pipPlacement";
import { useUITheme } from "../../theme/ThemeProvider";
import { fade } from "../../theme/uiTheme";

const CORNER_ICONS: Record<PipCorner, LucideIcon> = {
  "top-left": ArrowUpLeft,
  "top-right": ArrowUpRight,
  "bottom-left": ArrowDownLeft,
  "bottom-right": ArrowDownRight,
};

interface PipPlacementControlsProps {
  placement: PipPlacement;
  onChange: (patch: Partial<PipPlacement>) => void;
  /** Corners already taken by another window, offered but marked as such. */
  takenCorners?: PipCorner[];
  /** Drops the field labels for a row that already sits under a heading. */
  compact?: boolean;
}

/**
 * Where a corner window sits and how big it is: the one control for it, shared
 * by the presentation's secondary module and by the stream's extra cameras, so
 * an operator who learns it on one finds the same thing on the other.
 */
export function PipPlacementControls({
  placement,
  onChange,
  takenCorners = [],
  compact,
}: PipPlacementControlsProps) {
  const { colors, fonts } = useUITheme();

  const label = (text: string) => (
    <span
      style={{
        fontFamily: fonts.ui,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.4,
        textTransform: "uppercase",
        color: colors.dim,
      }}
    >
      {text}
    </span>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {!compact && label("Position")}
        <div style={{ display: "flex", gap: 5 }}>
          {PIP_CORNERS.map((corner) => {
            const Icon = CORNER_ICONS[corner];
            const active = placement.corner === corner;
            const taken = !active && takenCorners.includes(corner);
            return (
              <button
                key={corner}
                onClick={() => onChange({ corner })}
                title={
                  taken
                    ? `${PIP_CORNER_LABELS[corner]} (shared with another window)`
                    : PIP_CORNER_LABELS[corner]
                }
                aria-label={PIP_CORNER_LABELS[corner]}
                aria-pressed={active}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  background: active ? fade(colors.accent, 0.18) : colors.raise,
                  color: active
                    ? colors.accentSoft
                    : taken
                      ? colors.dim
                      : colors.sub,
                  border: `1px solid ${
                    active ? fade(colors.accent, 0.36) : colors.border
                  }`,
                }}
              >
                <Icon size={15} />
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {!compact && label("Size")}
        <input
          type="range"
          className="ws-slider"
          aria-label="Window size"
          min={PIP_SIZE_MIN}
          max={PIP_SIZE_MAX}
          value={placement.size}
          onChange={(event) => onChange({ size: Number(event.target.value) })}
          style={{ flex: 1, minWidth: 90 }}
        />
        <span
          style={{
            fontFamily: fonts.ui,
            fontSize: 11.5,
            fontWeight: 700,
            color: colors.sub,
            fontVariantNumeric: "tabular-nums",
            minWidth: 34,
            textAlign: "right",
          }}
        >
          {placement.size}%
        </span>
      </div>
    </div>
  );
}
