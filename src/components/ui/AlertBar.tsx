import { AlertTriangle, Info, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AppAlert } from "../../types";
import { useUITheme } from "../../theme/ThemeProvider";
import { useStore } from "../../store/useStore";

const STYLES: Record<
  AppAlert["kind"],
  { bg: string; border: string; color: string; icon: LucideIcon }
> = {
  error: {
    bg: "rgba(239,68,68,0.16)",
    border: "rgba(239,68,68,0.45)",
    color: "#fecaca",
    icon: AlertTriangle,
  },
  warning: {
    bg: "rgba(251,113,133,0.14)",
    border: "rgba(251,113,133,0.4)",
    color: "#fecdd3",
    icon: AlertTriangle,
  },
  info: {
    bg: "rgba(96,165,250,0.14)",
    border: "rgba(96,165,250,0.4)",
    color: "#dbeafe",
    icon: Info,
  },
};

export function AlertBar() {
  const { fonts } = useUITheme();
  const UI = fonts.ui;
  const alerts = useStore((s) => s.alerts);
  const dismissAlert = useStore((s) => s.dismissAlert);
  if (alerts.length === 0) return null;

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 360,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {alerts.map((alert) => {
        const s = STYLES[alert.kind];
        const Icon = s.icon;
        return (
          <div
            key={alert.id}
            role="alert"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 11,
              padding: "11px clamp(14px,4vw,24px)",
              background: s.bg,
              borderBottom: `1px solid ${s.border}`,
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            }}
          >
            <Icon
              size={17}
              color={s.color}
              style={{ flexShrink: 0, marginTop: 1 }}
            />
            <span
              style={{
                flex: 1,
                fontFamily: UI,
                fontSize: 13.5,
                color: s.color,
                lineHeight: 1.5,
              }}
            >
              {alert.message}
            </span>
            <button
              onClick={() => dismissAlert(alert.id)}
              aria-label="Dismiss"
              style={{
                flexShrink: 0,
                width: 26,
                height: 26,
                display: "grid",
                placeItems: "center",
                borderRadius: 7,
                border: "none",
                background: "transparent",
                color: s.color,
                cursor: "pointer",
                opacity: 0.8,
              }}
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
