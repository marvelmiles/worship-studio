import { AlertTriangle, Info, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AppAlert } from "../../types";
import { useUITheme } from "../../theme/ThemeProvider";
import { feedbackTone } from "../../theme/uiTheme";
import { useStore } from "../../store/useStore";

const ICONS: Record<AppAlert["kind"], LucideIcon> = {
  error: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
};

export function AlertBar() {
  const { fonts, colors } = useUITheme();
  const UI = fonts.ui;
  const tones: Record<AppAlert["kind"], ReturnType<typeof feedbackTone>> = {
    error: feedbackTone(colors.danger),
    warning: feedbackTone(colors.warning),
    info: feedbackTone(colors.info),
  };
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
        const tone = tones[alert.kind];
        const Icon = ICONS[alert.kind];
        return (
          <div
            key={alert.id}
            role="alert"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 11,
              padding: "11px clamp(14px,4vw,24px)",
              background: tone.bg,
              borderBottom: `1px solid ${tone.border}`,
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            }}
          >
            <Icon
              size={17}
              color={tone.text}
              style={{ flexShrink: 0, marginTop: 1 }}
            />
            <span
              style={{
                flex: 1,
                fontFamily: UI,
                fontSize: 13.5,
                color: tone.text,
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
                color: tone.text,
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
