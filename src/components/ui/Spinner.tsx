import { fade } from "../../theme/uiTheme";
import { useUITheme } from "../../theme/ThemeProvider";

interface SpinnerProps {
  size?: number;
  color?: string;
  /** Extra space around the spinner when it sits alone in a container. */
  padded?: boolean;
}

export function Spinner({ size = 16, color, padded }: SpinnerProps) {
  const { colors } = useUITheme();
  const spinColor = color ?? colors.accent;
  return (
    <span
      role="status"
      aria-label="Loading"
      style={{
        display: "inline-block",
        width: size,
        height: size,
        flexShrink: 0,
        border: `${Math.max(2, size / 8)}px solid ${fade(spinColor, 0.25)}`,
        borderTopColor: spinColor,
        borderRadius: "50%",
        animation: "wfSpin 0.7s linear infinite",
        margin: padded ? 20 : 0,
      }}
    />
  );
}

/** Fills its parent and centers a spinner, for loading panels and pages. */
export function LoadingArea({ size = 26 }: { size?: number }) {
  return (
    <div
      style={{
        display: "grid",
        placeItems: "center",
        height: "100%",
        minHeight: 120,
        width: "100%",
      }}
    >
      <Spinner size={size} />
    </div>
  );
}
