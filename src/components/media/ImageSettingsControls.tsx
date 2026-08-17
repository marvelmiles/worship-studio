import {
  FlipHorizontal2,
  FlipVertical2,
  RotateCcw,
  RotateCw,
} from "lucide-react";
import type { ImageSettings } from "../../types";
import { Button } from "../ui/Button";
import { Field, SectionTitle, Select, Toggle } from "../ui/Field";
import { AdjustmentControls } from "./AdjustmentControls";

const FIT_OPTIONS = [
  { value: "contain", label: "Contain (fit, letterboxed)" },
  { value: "cover", label: "Cover (fill, may crop)" },
  { value: "fill", label: "Fill (stretch)" },
];

interface ImageSettingsControlsProps {
  settings: ImageSettings;
  onChange: (changes: Partial<ImageSettings>) => void;
  /** Stacks the fit and overlay controls, for a narrow sidebar. */
  narrow?: boolean;
}

/**
 * Every setting a picture carries, wherever it is being edited: the media
 * library's own editor page, the modal the asset library and the slide
 * backgrounds open, and anywhere else a picture is tuned.
 */
export function ImageSettingsControls({
  settings,
  onChange,
  narrow,
}: ImageSettingsControlsProps) {
  const rotateBy = (delta: 90 | -90) =>
    onChange({
      rotate: ((((settings.rotate + delta) % 360) + 360) %
        360) as ImageSettings["rotate"],
    });

  return (
    <>
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
          onClick={() => onChange({ flipH: !settings.flipH })}
        >
          <FlipHorizontal2 size={14} />
          Flip H
        </Button>
        <Button
          size="sm"
          variant={settings.flipV ? "primary" : "ghost"}
          onClick={() => onChange({ flipV: !settings.flipV })}
        >
          <FlipVertical2 size={14} />
          Flip V
        </Button>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: narrow
            ? "1fr"
            : "repeat(auto-fit,minmax(200px,1fr))",
          gap: "0 16px",
        }}
      >
        <Field label="Screen fit">
          <Select
            value={settings.fit}
            options={FIT_OPTIONS}
            onChange={(event) =>
              onChange({ fit: event.target.value as ImageSettings["fit"] })
            }
          />
        </Field>
        <div style={{ paddingTop: narrow ? 0 : 24, paddingBottom: 12 }}>
          <Toggle
            label="Darken overlay (legibility)"
            checked={settings.scrim}
            onChange={(scrim) => onChange({ scrim })}
          />
        </div>
      </div>

      <SectionTitle>Adjustments</SectionTitle>
      <AdjustmentControls value={settings} onChange={onChange} />
    </>
  );
}
