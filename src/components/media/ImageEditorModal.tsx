import { useState } from "react";
import { Save, Undo2 } from "lucide-react";
import type { ImageSettings } from "../../types";
import { colors, UI } from "../../theme/tokens";
import { useBlobUrl } from "../../lib/blobUrls";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Field, TextInput } from "../../components/ui/Field";
import { ImageLayer } from "../../components/media/ImageLayer";
import { ImageSettingsControls } from "./ImageSettingsControls";

interface ImageEditorModalProps {
  title: string;
  /** Says which copy of the picture the changes land on. */
  note?: string;
  /** File to preview, resolved to an object URL while the editor is open. */
  blobId?: string | null;
  /** Used when the picture has no stored file (bundled and legacy inline data). */
  fallbackSrc?: string | null;
  alt: string;
  /** Omit to hide the name field. */
  initialName?: string;
  initialSettings: ImageSettings;
  /** What "Reset all" goes back to. */
  defaults: ImageSettings;
  onSave: (settings: ImageSettings, name: string) => void;
  onClose: () => void;
}

/**
 * Edits one picture. The caller owns where the result is written, so the same
 * editor serves the media library, the asset library and a single slide,
 * manuscript or passage. Mount it keyed by the picture being edited: the draft
 * lives for as long as the editor is open.
 */
export function ImageEditorModal({
  title,
  note,
  blobId,
  fallbackSrc,
  alt,
  initialName,
  initialSettings,
  defaults,
  onSave,
  onClose,
}: ImageEditorModalProps) {
  const [name, setName] = useState(initialName ?? "");
  const [settings, setSettings] = useState<ImageSettings>(initialSettings);
  const blobUrl = useBlobUrl(blobId ?? null);

  const patch = (changes: Partial<ImageSettings>) =>
    setSettings((prev) => ({ ...prev, ...changes }));

  const save = () => {
    onSave(settings, name.trim());
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      width={760}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="ghost" onClick={() => setSettings(defaults)}>
            <Undo2 size={14} />
            Reset all
          </Button>
          <Button variant="primary" onClick={save}>
            <Save size={15} />
            Save
          </Button>
        </>
      }
    >
      {note && (
        <p
          style={{
            fontFamily: UI,
            fontSize: 12.5,
            color: colors.sub,
            margin: "0 0 14px",
            lineHeight: 1.55,
          }}
        >
          {note}
        </p>
      )}

      <div
        style={{
          position: "relative",
          aspectRatio: "16/9",
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <ImageLayer
          src={blobUrl ?? fallbackSrc ?? null}
          alt={alt}
          settings={settings}
        />
      </div>

      {initialName !== undefined && (
        <div style={{ marginTop: 16 }}>
          <Field label="Name">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
        </div>
      )}

      <ImageSettingsControls settings={settings} onChange={patch} />
    </Modal>
  );
}
