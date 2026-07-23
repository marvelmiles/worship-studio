import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { fade } from "../../theme/uiTheme";
import { useUITheme } from "../../theme/ThemeProvider";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  message: string;
  action?: ReactNode;
  /** Compact spacing for empty states inside panels and modals. */
  compact?: boolean;
  /** Drops the glass card so it can sit inside an existing panel. */
  bare?: boolean;
}

/** Friendly illustrated placeholder shown wherever a list has nothing in it. */
export function EmptyState({
  icon: Icon,
  title,
  message,
  action,
  compact,
  bare,
}: EmptyStateProps) {
  const { colors, fonts, glass } = useUITheme();
  const UI = fonts.ui;
  const DISPLAY = fonts.display;
  return (
    <div
      style={{
        ...(bare ? {} : glass),
        padding: compact ? "34px 24px" : "56px 28px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          position: "relative",
          width: 104,
          height: 104,
          margin: "0 auto 20px",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${fade(colors.accent, 0.16)}, transparent 70%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 10,
            borderRadius: "50%",
            border: `1px dashed ${fade(colors.accent, 0.3)}`,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 26,
            borderRadius: 24,
            display: "grid",
            placeItems: "center",
            background: colors.panelSolid,
            border: `1px solid ${colors.borderStrong}`,
            boxShadow: `0 12px 30px rgba(0,0,0,0.35)`,
            color: colors.accent,
          }}
        >
          <Icon size={26} />
        </div>
      </div>
      <h3
        style={{
          fontFamily: DISPLAY,
          fontSize: 19,
          fontWeight: 600,
          color: colors.text,
          margin: "0 0 6px",
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontFamily: UI,
          fontSize: 13.5,
          color: colors.sub,
          margin: "0 auto",
          maxWidth: 380,
          lineHeight: 1.6,
        }}
      >
        {message}
      </p>
      {action && (
        <div
          style={{ marginTop: 18, display: "flex", justifyContent: "center" }}
        >
          {action}
        </div>
      )}
    </div>
  );
}
