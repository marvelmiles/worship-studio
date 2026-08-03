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

interface MissingArtifactProps {
  icon: LucideIcon;
  compact?: boolean;
}

/** A stack of slide frames whose front slot is empty: the product-specific way
 *  to say an artifact (manuscript, passage, media, theme) belongs here but is missing.
 *  The faint skeleton bars stand in for the content waiting to be built. */
function MissingArtifact({ icon: Icon, compact }: MissingArtifactProps) {
  const { colors, shadows } = useUITheme();
  const frameW = compact ? 104 : 128;
  const frameH = compact ? 66 : 80;
  const iconSize = compact ? 22 : 26;

  const ghostFrame = {
    position: "absolute" as const,
    top: 0,
    left: "50%",
    width: frameW,
    height: frameH,
    marginLeft: -frameW / 2,
    borderRadius: 14,
    background: colors.panel,
    border: `1px solid ${colors.border}`,
    boxShadow: "0 8px 20px rgba(0,0,0,0.28)",
  };

  const bar = (width: number) => ({
    height: 6,
    width,
    borderRadius: 99,
    background: fade(colors.sub, 0.28),
  });

  return (
    <div
      style={{
        position: "relative",
        width: frameW + 40,
        height: frameH + 30,
        margin: "0 auto 22px",
      }}
    >
      <div
        style={{
          ...ghostFrame,
          transform: "translate(-16px, 16px) rotate(-8deg)",
          opacity: 0.55,
        }}
      />
      <div
        style={{
          ...ghostFrame,
          transform: "translate(18px, 11px) rotate(7deg)",
          opacity: 0.7,
        }}
      />
      <div
        style={{
          ...ghostFrame,
          background: colors.panelSolid,
          boxShadow: shadows.overlay,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 9,
          opacity: 1,
        }}
      >
        <div style={{ color: colors.accent, display: "grid" }}>
          <Icon size={iconSize} />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 5,
            alignItems: "center",
          }}
        >
          <div style={bar(compact ? 44 : 54)} />
          <div style={bar(compact ? 28 : 34)} />
        </div>
      </div>
    </div>
  );
}

/** Placeholder shown wherever a list has nothing in it, built around a
 *  missing-artifact motif so an empty space reads as work waiting to be done. */
export function EmptyState({
  icon,
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
      <MissingArtifact icon={icon} compact={compact} />
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
