import { useState } from "react";
import {
  FlipHorizontal2,
  FlipVertical2,
  RotateCcw,
  RotateCw,
  Save,
  Undo2,
} from "lucide-react";
import type { ImageSettings } from "../../types";
import { colors, UI } from "../../theme/tokens";
import { useBlobUrl } from "../../lib/blobUrls";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import {
  Field,
  Select,
  TextInput,
  Toggle,
  SectionTitle,
} from "../../components/ui/Field";
import { ImageLayer } from "../../components/media/ImageLayer";
import { AdjustmentControls } from "./AdjustmentControls";

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

const FIT_OPTIONS = [
  { value: "contain", label: "Contain (fit, letterboxed)" },
  { value: "cover", label: "Cover (fill, may crop)" },
  { value: "fill", label: "Fill (stretch)" },
];

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

  const rotateBy = (delta: 90 | -90) =>
    patch({
      rotate: ((((settings.rotate + delta) % 360) + 360) %
        360) as ImageSettings["rotate"],
    });

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
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
          gap: "0 16px",
        }}
      >
        <Field label="Screen fit">
          <Select
            value={settings.fit}
            options={FIT_OPTIONS}
            onChange={(e) =>
              patch({ fit: e.target.value as ImageSettings["fit"] })
            }
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
