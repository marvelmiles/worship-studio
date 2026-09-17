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
  info?: ReactNode;
  dismissible?: boolean;
}

export const Modal = ({
  open,
  onClose,
  title,
  children,
  width = 520,
  footer,
  info,
  dismissible = true,
}: ModalProps) => {
  const { colors, fonts, glass, shadows } = useUITheme();
  if (!open) return null;
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onClick={dismissible ? onClose : undefined}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: colors.scrim,
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
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
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
            gap: 8,
            padding: "18px 22px",
            borderBottom: `1px solid ${colors.border}`,
            flexShrink: 0,
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
          {info && (
            <div style={{ marginRight: "auto", marginLeft: 6 }}>{info}</div>
          )}
          {dismissible && (
            <IconButton icon={X} onClick={onClose} title="Close" />
          )}
        </div>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            overscrollBehavior: "contain",
            padding: 22,
          }}
        >
          {children}
        </div>
        {footer && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              flexWrap: "wrap",
              gap: 10,
              padding: "16px 22px",
              borderTop: `1px solid ${colors.border}`,
              flexShrink: 0,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};
