import { AlertTriangle } from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import { Modal } from "./Modal";
import { Button } from "./Button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { colors, fonts } = useUITheme();
  const UI = fonts.ui;
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      width={440}
      footer={
        <>
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <AlertTriangle size={20} color={colors.danger} style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontFamily: UI, fontSize: 13.5, color: colors.text, lineHeight: 1.6, margin: 0 }}>
          {message}
        </p>
      </div>
    </Modal>
  );
}
