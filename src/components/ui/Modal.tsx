import type { ReactNode } from "react";
import { X } from "lucide-react";
import { C, DISPLAY, glass } from "../../theme/tokens";
import { IconBtn } from "./Button";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: number;
  footer?: ReactNode;
}

export function Modal({ open, onClose, title, children, width = 520, footer }: ModalProps) {
  if (!open) return null;
  return (
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
        background: "rgba(6,5,9,0.7)",
        backdropFilter: "blur(6px)",
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
          background: "rgba(20,18,26,0.96)",
          boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 22px",
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <h3 style={{ margin: 0, fontFamily: DISPLAY, fontSize: 19, fontWeight: 600, color: C.text }}>
            {title}
          </h3>
          <IconBtn icon={X} onClick={onClose} title="Close" />
        </div>
        <div style={{ padding: 22 }}>{children}</div>
        {footer && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              padding: "16px 22px",
              borderTop: `1px solid ${C.border}`,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
