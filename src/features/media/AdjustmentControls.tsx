import type { MediaAdjustments } from "../../types";
import { Field, Range } from "../../components/ui/Field";

interface AdjustmentControlsProps {
  value: MediaAdjustments;
  onChange: (changes: Partial<MediaAdjustments>) => void;
}

const SLIDERS: { key: keyof MediaAdjustments; label: string; min: number; max: number; suffix: string }[] = [
  { key: "brightness", label: "Brightness", min: 20, max: 200, suffix: "%" },
  { key: "contrast", label: "Contrast", min: 20, max: 200, suffix: "%" },
  { key: "saturation", label: "Saturation", min: 0, max: 200, suffix: "%" },
  { key: "grayscale", label: "Grayscale", min: 0, max: 100, suffix: "%" },
  { key: "sepia", label: "Sepia", min: 0, max: 100, suffix: "%" },
  { key: "blur", label: "Blur", min: 0, max: 20, suffix: "px" },
];

export function AdjustmentControls({ value, onChange }: AdjustmentControlsProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "0 16px" }}>
      {SLIDERS.map(({ key, label, min, max, suffix }) => (
        <Field key={key} label={label}>
          <Range
            value={value[key]}
            min={min}
            max={max}
            suffix={suffix}
            onChange={(e) => onChange({ [key]: Number(e.target.value) })}
          />
        </Field>
      ))}
    </div>
  );
}
