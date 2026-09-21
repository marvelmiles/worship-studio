import type { ReactNode } from "react";
import { useUITheme } from "../../theme/ThemeProvider";

interface ProgressRingProps {
  /** How far along, 0 to 100. Ignored while indeterminate. */
  value?: number;
  size?: number;
  thickness?: number;
  color?: string;
  trackColor?: string;
  /** Spins a short arc instead, for work whose end is not yet measurable. */
  indeterminate?: boolean;
  label: string;
  children?: ReactNode;
}

const SWEEP_FRACTION = 0.3;

export const ProgressRing = ({
  value = 0,
  size = 30,
  thickness = 3,
  color,
  trackColor,
  indeterminate = false,
  label,
  children,
}: ProgressRingProps) => {
  const { colors, controls } = useUITheme();
  const stroke = color ?? colors.accent;
  const track = trackColor ?? controls.track;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const percent = Math.max(0, Math.min(100, value));
  const sweep = indeterminate
    ? circumference * SWEEP_FRACTION
    : (circumference * percent) / 100;
  const centre = size / 2;

  return (
    <span
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : Math.round(percent)}
      style={{
        position: "relative",
        display: "inline-grid",
        placeItems: "center",
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          animation: indeterminate ? "wfSpin 1s linear infinite" : undefined,
        }}
      >
        <g transform={`rotate(-90 ${centre} ${centre})`}>
          <circle
            cx={centre}
            cy={centre}
            r={radius}
            fill="none"
            stroke={track}
            strokeWidth={thickness}
          />
          <circle
            cx={centre}
            cy={centre}
            r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={`${sweep} ${circumference}`}
            style={{
              transition: indeterminate
                ? undefined
                : "stroke-dasharray .2s ease",
            }}
          />
        </g>
      </svg>
      {children != null && (
        <span style={{ position: "relative", display: "inline-flex" }}>
          {children}
        </span>
      )}
    </span>
  );
};
