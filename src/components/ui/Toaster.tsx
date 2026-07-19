import { useEffect } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import type { Toast } from "../../types";
import { useStore } from "../../store/useStore";
import { useUITheme } from "../../theme/ThemeProvider";

export function Toaster() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 400,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        width: "min(420px, calc(100vw - 32px))",
        pointerEvents: "none",
      }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const { colors, fonts } = useUITheme();
  const UI = fonts.ui;
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, 3400);
    return () => window.clearTimeout(timer);
  }, [onDismiss]);

  const success = toast.kind === "success";
  const Icon = success ? CheckCircle2 : AlertCircle;
  const accent = success ? colors.success : colors.danger;

  return (
    <div
      style={{
        pointerEvents: "auto",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "13px 14px",
        borderRadius: 13,
        background: "rgba(22,19,36,0.85)",
        backdropFilter: "blur(18px) saturate(150%)",
        WebkitBackdropFilter: "blur(18px) saturate(150%)",
        border: `1px solid ${colors.border}`,
        borderLeft: `3px solid ${accent}`,
        boxShadow: "0 18px 50px rgba(0,0,0,0.5)",
        animation: "wfToastIn 0.28s cubic-bezier(0.2,0.9,0.3,1)",
      }}
    >
      <Icon size={19} color={accent} />
      <span style={{ flex: 1, fontFamily: UI, fontSize: 13.5, color: colors.text }}>{toast.message}</span>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{
          background: "transparent",
          border: "none",
          color: colors.dim,
          cursor: "pointer",
          display: "grid",
          placeItems: "center",
        }}
      >
        <X size={15} />
      </button>
    </div>
  );
}
