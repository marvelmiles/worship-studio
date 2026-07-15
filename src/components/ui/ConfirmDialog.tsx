import { AlertTriangle } from "lucide-react";
import { C, UI } from "../../theme/tokens";
import { Modal } from "./Modal";
import { Btn } from "./Button";

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
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      width={440}
      footer={
        <>
          <Btn onClick={onCancel}>Cancel</Btn>
          <Btn variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Btn>
        </>
      }
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <AlertTriangle size={20} color={C.danger} style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontFamily: UI, fontSize: 13.5, color: C.text, lineHeight: 1.6, margin: 0 }}>
          {message}
        </p>
      </div>
    </Modal>
  );
}
