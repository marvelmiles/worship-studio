import { useState } from "react";
import { Save, Undo2 } from "lucide-react";
import type { ImageSettings } from "../../types";
import { useBlobUrl } from "../../lib/blobUrls";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Field, TextInput } from "../../components/ui/Field";
import { ImageLayer } from "../../components/media/ImageLayer";
import { ImageSettingsControls } from "./ImageSettingsControls";
import { InfoTip } from "../ui/InfoTip";

interface ImageEditorModalProps {
  title: string;
  note?: string;
  blobId?: string | null;
  fallbackSrc?: string | null;
  alt: string;
  initialName?: string;
  initialSettings: ImageSettings;
  defaults: ImageSettings;
  onSave: (settings: ImageSettings, name: string) => void;
  onClose: () => void;
}

export const ImageEditorModal = ({
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
}: ImageEditorModalProps) => {
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
      info={
        note ? <InfoTip title="Where changes go">{note}</InfoTip> : undefined
      }
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
};
