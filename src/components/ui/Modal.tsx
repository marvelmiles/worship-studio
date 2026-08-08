import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import { IconButton } from "./Button";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: number;
  footer?: ReactNode;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  width = 520,
  footer,
}: ModalProps) {
  const { colors, fonts, glass, shadows } = useUITheme();
  if (!open) return null;
  // Portalled: a modal opened from inside another one (editing a background
  // picture from the asset library, say) would otherwise be trapped by the
  // blurred panel around it, which is a containing block for fixed children.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(10px)",
        animation: "wfFade .18s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: width,
          maxHeight: "90vh",
          overflow: "auto",
          ...glass,
          borderRadius: 20,
          background: colors.panel,
          boxShadow: `${shadows.overlay}, inset 0 1px 0 rgba(255,255,255,0.06)`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 22px",
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontFamily: fonts.display,
              fontSize: 19,
              fontWeight: 600,
              color: colors.text,
            }}
          >
            {title}
          </h3>
          <IconButton icon={X} onClick={onClose} title="Close" />
        </div>
        <div style={{ padding: 22 }}>{children}</div>
        {footer && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              padding: "16px 22px",
              borderTop: `1px solid ${colors.border}`,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
