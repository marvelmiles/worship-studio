import { useEffect, useState } from "react";
import { FlipHorizontal2, FlipVertical2, RotateCcw, RotateCw, Save, Undo2 } from "lucide-react";
import type { ImageSettings, MediaItem } from "../../types";
import { useStore } from "../../store/useStore";
import { DEFAULT_IMAGE_SETTINGS, imageSettingsOf } from "../../lib/media";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Field, Select, TextInput, Toggle, SectionTitle } from "../../components/ui/Field";
import { ImageSurface } from "../../components/media/ImageSurface";
import { AdjustmentControls } from "./AdjustmentControls";

interface ImageEditorModalProps {
  item: MediaItem | null;
  onClose: () => void;
}

const FIT_OPTIONS = [
  { value: "contain", label: "Contain (fit, letterboxed)" },
  { value: "cover", label: "Cover (fill, may crop)" },
  { value: "fill", label: "Fill (stretch)" },
];

export function ImageEditorModal({ item, onClose }: ImageEditorModalProps) {
  const updateMedia = useStore((s) => s.updateMedia);
  const pushToast = useStore((s) => s.pushToast);

  const [name, setName] = useState("");
  const [settings, setSettings] = useState<ImageSettings>(DEFAULT_IMAGE_SETTINGS);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setSettings(imageSettingsOf(item));
    }
  }, [item]);

  if (!item) return null;

  const patch = (changes: Partial<ImageSettings>) =>
    setSettings((prev) => ({ ...prev, ...changes }));

  const rotateBy = (delta: 90 | -90) =>
    patch({ rotate: (((settings.rotate + delta) % 360) + 360) % 360 as ImageSettings["rotate"] });

  const save = () => {
    updateMedia(item.id, { name: name.trim() || item.name, image: settings });
    pushToast("Image saved.");
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit Image"
      width={760}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="ghost" onClick={() => setSettings(DEFAULT_IMAGE_SETTINGS)}>
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
        <ImageSurface item={item} settings={settings} />
      </div>

      <div style={{ marginTop: 16 }}>
        <Field label="Name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
      </div>

      <SectionTitle>Transform</SectionTitle>
      <div className="ws-row-wrap" style={{ marginBottom: 12 }}>
        <Button size="sm" variant="ghost" onClick={() => rotateBy(-90)}>
          <RotateCcw size={14} />
          Rotate left
        </Button>
        <Button size="sm" variant="ghost" onClick={() => rotateBy(90)}>
          <RotateCw size={14} />
          Rotate right
        </Button>
        <Button
          size="sm"
          variant={settings.flipH ? "primary" : "ghost"}
          onClick={() => patch({ flipH: !settings.flipH })}
        >
          <FlipHorizontal2 size={14} />
          Flip H
        </Button>
        <Button
          size="sm"
          variant={settings.flipV ? "primary" : "ghost"}
          onClick={() => patch({ flipV: !settings.flipV })}
        >
          <FlipVertical2 size={14} />
          Flip V
        </Button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "0 16px" }}>
        <Field label="Screen fit">
          <Select
            value={settings.fit}
            options={FIT_OPTIONS}
            onChange={(e) => patch({ fit: e.target.value as ImageSettings["fit"] })}
          />
        </Field>
        <div style={{ paddingTop: 24 }}>
          <Toggle
            label="Darken overlay (legibility)"
            checked={settings.scrim}
            onChange={(scrim) => patch({ scrim })}
          />
        </div>
      </div>

      <SectionTitle>Adjustments</SectionTitle>
      <AdjustmentControls value={settings} onChange={patch} />
    </Modal>
  );
}
