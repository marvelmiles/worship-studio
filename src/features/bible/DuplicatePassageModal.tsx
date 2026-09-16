import { CopyPlus, RefreshCw } from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";

interface DuplicatePassageModalProps {
  existingTitle: string | null;
  onOverwrite: () => void;
  onSaveCopy: () => void;
  onClose: () => void;
}

export const DuplicatePassageModal = ({
  existingTitle,
  onOverwrite,
  onSaveCopy,
  onClose,
}: DuplicatePassageModalProps) => {
  const { colors, fonts } = useUITheme();
  if (!existingTitle) return null;

  return (
    <Modal
      open
      onClose={onClose}
      title="Passage already saved"
      width={480}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="ghost" onClick={onSaveCopy}>
            <CopyPlus size={15} />
            Save as copy
          </Button>
          <Button variant="primary" onClick={onOverwrite}>
            <RefreshCw size={15} />
            Overwrite existing
          </Button>
        </>
      }
    >
      <p
        style={{
          fontFamily: fonts.ui,
          fontSize: 13.5,
          color: colors.text,
          marginTop: 0,
          lineHeight: 1.65,
        }}
      >
        "{existingTitle}" is already in your saved passages, but the saved one
        doesn't match what you're saving now.
      </p>
      <p
        style={{
          fontFamily: fonts.ui,
          fontSize: 13,
          color: colors.sub,
          margin: 0,
          lineHeight: 1.65,
        }}
      >
        Overwrite it with this new content, or keep both; the new one is saved
        as a numbered copy like "{existingTitle} (1)".
      </p>
    </Modal>
  );
};
