import type { Background, ImageSettings } from "../../types";
import { useStore } from "../../store/useStore";
import {
  DEFAULT_BACKGROUND_IMAGE_SETTINGS,
  backgroundImageSettings,
} from "../../lib/media";
import { ImageEditorModal } from "./ImageEditorModal";

/** Where the edit is written, and what to call it in the editor. */
export interface BackgroundImageUsage {
  /** What the change applies to, e.g. "this slide". */
  label: string;
  settings: ImageSettings;
  onChange: (settings: ImageSettings) => void;
}

interface BackgroundImageEditorModalProps {
  background: Background;
  /**
   * Edits the copy held by one slide, manuscript or passage. Left out, the
   * asset library entry itself is edited instead.
   */
  usage?: BackgroundImageUsage;
  onClose: () => void;
}

/**
 * Opens the picture editor on a background, in one of the two scopes the
 * library supports: the document's own copy, or the asset library entry that
 * seeds every future use of the picture.
 */
export function BackgroundImageEditorModal({
  background,
  usage,
  onClose,
}: BackgroundImageEditorModalProps) {
  const updateBackground = useStore((s) => s.updateBackground);
  const pushToast = useStore((s) => s.pushToast);

  if (usage)
    return (
      <ImageEditorModal
        title="Edit Picture"
        note={`These changes apply to ${usage.label} only. The copy in your asset library is left as it is.`}
        blobId={background.blobId}
        fallbackSrc={background.dataUrl}
        alt={background.name}
        initialSettings={usage.settings}
        defaults={backgroundImageSettings(background)}
        onSave={(settings) => usage.onChange(settings)}
        onClose={onClose}
      />
    );

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
}
