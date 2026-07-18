import { CopyPlus, RefreshCw } from "lucide-react";
import { C, UI } from "../../theme/tokens";
import { Modal } from "../../components/ui/Modal";
import { Btn } from "../../components/ui/Button";

interface DuplicatePassageModalProps {
  /** Title of the already-saved passage; null keeps the modal closed. */
  existingTitle: string | null;
  onOverwrite: () => void;
  onSaveCopy: () => void;
  onClose: () => void;
}

/**
 * Shown when saving a passage that is already in the library but with
 * different content (other slide settings or verse text). The user chooses:
 * overwrite the saved one, or keep both as a numbered copy.
 */
export function DuplicatePassageModal({
  existingTitle,
  onOverwrite,
  onSaveCopy,
  onClose,
}: DuplicatePassageModalProps) {
  if (!existingTitle) return null;

  return (
    <Modal
      open
      onClose={onClose}
      title="Passage already saved"
      width={480}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="ghost" onClick={onSaveCopy}>
            <CopyPlus size={15} />
            Save as copy
          </Btn>
          <Btn variant="primary" onClick={onOverwrite}>
            <RefreshCw size={15} />
            Overwrite existing
          </Btn>
        </>
      }
    >
      <p style={{ fontFamily: UI, fontSize: 13.5, color: C.text, marginTop: 0, lineHeight: 1.65 }}>
        “{existingTitle}” is already in your saved passages, but the saved one
        doesn't match what you're saving now.
      </p>
      <p style={{ fontFamily: UI, fontSize: 13, color: C.sub, margin: 0, lineHeight: 1.65 }}>
        Overwrite it with this new content, or keep both — the new one is saved
        as a numbered copy like “{existingTitle} (1)”.
      </p>
    </Modal>
  );
}
