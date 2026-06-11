import type { CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { C, UI } from "../../theme/tokens";

type BtnVariant = "primary" | "ghost" | "subtle" | "danger";
type BtnSize = "sm" | "md" | "lg";

interface BtnProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: BtnVariant;
  size?: BtnSize;
  title?: string;
  disabled?: boolean;
  style?: CSSProperties;
}

export function Btn({
  children,
  onClick,
  variant = "ghost",
  size = "md",
  title,
  disabled,
  style: st,
}: BtnProps) {
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontFamily: UI,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    borderRadius: 11,
    transition: "all .16s ease",
    whiteSpace: "nowrap",
    opacity: disabled ? 0.5 : 1,
    border: "1px solid transparent",
    padding: size === "sm" ? "6px 11px" : size === "lg" ? "12px 20px" : "9px 15px",
    fontSize: size === "sm" ? 12.5 : size === "lg" ? 15 : 13.5,
  };
  const variants: Record<BtnVariant, CSSProperties> = {
    primary: {
      background: `linear-gradient(180deg,${C.goldSoft},${C.gold})`,
      color: "#231a08",
      boxShadow: "0 6px 20px rgba(216,162,74,0.28)",
    },
    ghost: { background: C.raise, color: C.text, border: `1px solid ${C.border}` },
    subtle: { background: "transparent", color: C.sub, border: "1px solid transparent" },
    danger: {
      background: "rgba(224,100,79,0.14)",
      color: C.danger,
      border: "1px solid rgba(224,100,79,0.3)",
    },
  };
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.filter = "brightness(1.1)";
      }}
      onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
      style={{ ...base, ...variants[variant], ...st }}
    >
      {children}
    </button>
  );
}

interface IconBtnProps {
  icon: LucideIcon;
  onClick?: () => void;
  title: string;
  active?: boolean;
  danger?: boolean;
}

export function IconBtn({ icon: Icon, onClick, title, active, danger }: IconBtnProps) {
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 34,
        height: 34,
        borderRadius: 9,
        cursor: "pointer",
        transition: "all .15s",
        background: active ? "rgba(216,162,74,0.16)" : "transparent",
        color: danger ? C.danger : active ? C.goldSoft : C.sub,
        border: `1px solid ${active ? "rgba(216,162,74,0.3)" : "transparent"}`,
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = active
          ? "rgba(216,162,74,0.22)"
          : C.raise)
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = active
          ? "rgba(216,162,74,0.16)"
          : "transparent")
      }
    >
      <Icon size={16.5} />
    </button>
  );
}

interface PCtlProps {
  icon: LucideIcon;
  onClick?: () => void;
  title: string;
  active?: boolean;
  solid?: boolean;
}

/** Presentation-mode control button (light-on-dark). */
export function PCtl({ icon: Icon, onClick, title, active, solid }: PCtlProps) {
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
          ? "rgba(216,162,74,0.3)"
          : solid
          ? "rgba(255,255,255,0.1)"
          : "rgba(255,255,255,0.06)",
        color: active ? C.goldSoft : "#fff",
        border: "1px solid rgba(255,255,255,0.12)",
      }}
    >
      <Icon size={18} />
    </button>
  );
}
