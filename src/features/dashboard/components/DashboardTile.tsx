import type { LucideIcon } from "lucide-react";
import { fade } from "../../../theme/uiTheme";
import { useUITheme } from "../../../theme/ThemeProvider";
import { formatCount } from "../../../lib/formatNumber";

export interface DashboardTileProps {
  icon: LucideIcon;
  label: string;
  value?: number;
  sub?: string;
  color?: string;
  primary?: boolean;
  title: string;
  onClick: () => void;
}

export const DashboardTile = ({
  icon: Icon,
  label,
  value,
  sub,
  color,
  primary,
  title,
  onClick,
}: DashboardTileProps) => {
  const { colors, glass, fonts, shadows } = useUITheme();
  const accent = color ?? colors.accentSoft;
  const iconBackground = primary
    ? "rgba(255,255,255,0.18)"
    : fade(accent, 0.13);
  const iconColor = primary ? colors.onAccent : accent;

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        ...glass,
        display: "flex",
        alignItems: "center",
        gap: 13,
        width: "100%",
        minHeight: 84,
        padding: "16px 17px",
        textAlign: "left",
        cursor: "pointer",
        transition: "transform .16s ease, border-color .16s ease",
        background: primary ? colors.accent : colors.panel,
        border: `1px solid ${primary ? fade(colors.accentSoft, 0.45) : colors.border}`,
        boxShadow: primary
          ? `${shadows.cta}, inset 0 1px 0 rgba(255,255,255,0.12)`
          : glass.boxShadow,
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.transform = "translateY(-2px)";
        if (!primary)
          event.currentTarget.style.borderColor = colors.borderStrong;
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.transform = "none";
        if (!primary) event.currentTarget.style.borderColor = colors.border;
      }}
    >
      <span
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          flexShrink: 0,
          display: "grid",
          placeItems: "center",
          background: iconBackground,
          color: iconColor,
        }}
      >
        <Icon size={20} />
      </span>
      <span style={{ minWidth: 0, flex: 1 }}>
        {value === undefined ? (
          <>
            <span
              style={{
                display: "block",
                fontFamily: fonts.ui,
                fontSize: 14.5,
                fontWeight: 600,
                lineHeight: 1.25,
                color: primary ? colors.onAccent : colors.text,
              }}
            >
              {label}
            </span>
            {sub && (
              <span
                className="ws-ellipsis"
                style={{
                  display: "block",
                  fontFamily: fonts.ui,
                  fontSize: 12.5,
                  marginTop: 3,
                  color: primary ? "rgba(255,255,255,0.78)" : colors.sub,
                }}
              >
                {sub}
              </span>
            )}
          </>
        ) : (
          <>
            <span
              style={{
                display: "block",
                fontFamily: fonts.display,
                fontSize: 28,
                fontWeight: 600,
                lineHeight: 1,
                color: colors.text,
              }}
            >
              {formatCount(value)}
            </span>
            <span
              className="ws-ellipsis"
              style={{
                display: "block",
                fontFamily: fonts.ui,
                fontSize: 13,
                marginTop: 5,
                color: colors.sub,
              }}
            >
              {label}
            </span>
          </>
        )}
      </span>
    </button>
  );
};
