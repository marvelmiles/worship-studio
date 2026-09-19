import type { Background } from "../../types";
import { useStore } from "../../store/useStore";
import {
  DEFAULT_BACKGROUND_IMAGE_SETTINGS,
  backgroundImageSettings,
} from "../../lib/media";
import { ImageEditorModal } from "./ImageEditorModal";

interface BackgroundImageEditorModalProps {
  background: Background;
  onClose: () => void;
}

/** Edits a picture saved straight into the asset library, for the library. */
export const BackgroundImageEditorModal = ({
  background,
  onClose,
}: BackgroundImageEditorModalProps) => {
  const updateBackground = useStore((s) => s.updateBackground);
  const pushToast = useStore((s) => s.pushToast);

  return (
    <ImageEditorModal
      title="Edit Background"
      note="These changes are saved to your asset library. Slides, manuscripts and passages already using this picture keep the way they look now, so only later uses pick the changes up."
      blobId={background.blobId}
      fallbackSrc={background.dataUrl}
      alt={background.name}
      initialName={background.name}
      initialSettings={backgroundImageSettings(background)}
      defaults={DEFAULT_BACKGROUND_IMAGE_SETTINGS}
      onSave={(settings, name) => {
        updateBackground(background.id, {
          name: name || background.name,
          image: settings,
        });
        pushToast("Background saved.");
      }}
      onClose={onClose}
    />
  );
};
