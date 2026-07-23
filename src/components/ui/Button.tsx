import type { CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { fade } from "../../theme/uiTheme";
import { useUITheme } from "../../theme/ThemeProvider";
import { Spinner } from "./Spinner";

type ButtonVariant = "primary" | "ghost" | "subtle" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  title?: string;
  disabled?: boolean;
  /** Shows a spinner in place of the label and blocks clicks. */
  busy?: boolean;
  style?: CSSProperties;
}

export function Button({
  children,
  onClick,
  variant = "ghost",
  size = "md",
  title,
  disabled,
  busy,
  style,
}: ButtonProps) {
  const { colors, fonts } = useUITheme();
  const blocked = disabled || busy;
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontFamily: fonts.ui,
    fontWeight: 600,
    cursor: blocked ? "not-allowed" : "pointer",
    borderRadius: 11,
    transition: "all .16s ease",
    whiteSpace: "nowrap",
    opacity: disabled ? 0.5 : 1,
    border: "1px solid transparent",
    padding:
      size === "sm" ? "6px 11px" : size === "lg" ? "12px 20px" : "9px 15px",
    fontSize: size === "sm" ? 12.5 : size === "lg" ? 15 : 13.5,
  };
  const variants: Record<ButtonVariant, CSSProperties> = {
    primary: {
      background: colors.accent,
      color: colors.onAccent,
      border: `1px solid ${fade(colors.accentSoft, 0.35)}`,
      boxShadow: `0 6px 20px ${fade(colors.accent, 0.32)}, inset 0 1px 0 rgba(255,255,255,0.14)`,
    },
    ghost: {
      background: colors.raise,
      color: colors.text,
      border: `1px solid ${colors.border}`,
    },
    subtle: {
      background: "transparent",
      color: colors.sub,
      border: "1px solid transparent",
    },
    danger: {
      background: fade(colors.danger, 0.14),
      color: colors.danger,
      border: `1px solid ${fade(colors.danger, 0.3)}`,
    },
  };
  const spinnerColor = variant === "primary" ? colors.onAccent : colors.accent;
  return (
    <button
      title={title}
      disabled={blocked}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (!blocked) e.currentTarget.style.filter = "brightness(1.1)";
      }}
      onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
      style={{ ...base, ...variants[variant], ...style }}
    >
      {busy ? (
        <Spinner size={size === "sm" ? 13 : 15} color={spinnerColor} />
      ) : (
        children
      )}
    </button>
  );
}

interface IconButtonProps {
  icon: LucideIcon;
  onClick?: () => void;
  title: string;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
}

export function IconButton({
  icon: Icon,
  onClick,
  title,
  active,
  danger,
  disabled,
}: IconButtonProps) {
  const { colors } = useUITheme();
  const restBackground = active ? fade(colors.accent, 0.16) : "transparent";
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 34,
        height: 34,
        borderRadius: 9,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        transition: "all .15s",
        background: restBackground,
        color: danger ? colors.danger : active ? colors.accentSoft : colors.sub,
        border: `1px solid ${active ? fade(colors.accent, 0.3) : "transparent"}`,
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.background = active
          ? fade(colors.accent, 0.22)
          : colors.raise;
      }}
      onMouseLeave={(e) => (e.currentTarget.style.background = restBackground)}
    >
      <Icon size={16.5} />
    </button>
  );
}

interface StageButtonProps {
  icon: LucideIcon;
  onClick?: () => void;
  title: string;
  active?: boolean;
  solid?: boolean;
}

/** Control button used on the live presentation stage (light on dark). */
export function StageButton({
  icon: Icon,
  onClick,
  title,
  active,
  solid,
}: StageButtonProps) {
  const { colors, stage } = useUITheme();
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      style={{
        width: 40,
        height: 40,
        borderRadius: 10,
        cursor: "pointer",
        display: "grid",
        placeItems: "center",
        background: active
          ? fade(colors.accent, 0.3)
          : solid
            ? "rgba(255,255,255,0.1)"
            : "rgba(255,255,255,0.06)",
        color: active ? colors.accentSoft : stage.text,
        border: `1px solid ${stage.border}`,
      }}
    >
      <Icon size={18} />
    </button>
  );
}
