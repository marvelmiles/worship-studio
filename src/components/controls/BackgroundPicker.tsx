import { useRef, useState } from "react";
import { Palette, Upload } from "lucide-react";
import type { Background } from "../../types";
import { C } from "../../theme/tokens";
import { useStore } from "../../store/useStore";
import { Field, Select } from "../ui/Field";
import { Btn } from "../ui/Button";
import { CustomColorPicker } from "./CustomColorPicker";

interface BackgroundPickerProps {
  backgrounds: Background[];
  value: string;
  onSelect: (id: string) => void;
  inheritLabel?: string;
  highlightId?: string;
  onUploaded?: (id: string) => void;
  onAddColor?: (value: string, name?: string) => void;
}

export function swatchBackground(bg: Background): string {
  if (bg.type === "solid") return bg.color || "#111";
  if (bg.type === "image") return `center/cover url(${bg.dataUrl})`;
  return bg.css || "#111";
}

export function BackgroundPicker({
  backgrounds,
  value,
  onSelect,
  inheritLabel,
  highlightId,
  onUploaded,
  onAddColor,
}: BackgroundPickerProps) {
  const beginUpload = useStore((s) => s.beginUpload);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showColor, setShowColor] = useState(false);
  const activeId = highlightId ?? value;

  const options = [
    ...(inheritLabel ? [{ value: "", label: inheritLabel }] : []),
    ...backgrounds.map((bg) => ({ value: bg.id, label: `${bg.name} (${bg.category})` })),
  ];

  return (
    <>
      <Field label="Background">
        <Select value={value} options={options} onChange={(e) => onSelect(e.target.value)} />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 12 }}>
        {backgrounds.map((bg) => (
          <button
            key={bg.id}
            title={bg.name}
            onClick={() => onSelect(bg.id)}
            style={{
              aspectRatio: "16/9",
              borderRadius: 7,
              cursor: "pointer",
              background: swatchBackground(bg),
              border: `1.5px solid ${activeId === bg.id ? C.gold : C.border}`,
            }}
          />
        ))}
      </div>

      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {onUploaded && (
          <Btn variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>
            <Upload size={14} />
            Upload image
          </Btn>
        )}
        {onAddColor && (
          <Btn variant="ghost" size="sm" onClick={() => setShowColor((v) => !v)}>
            <Palette size={14} />
            Solid / custom color
          </Btn>
        )}
      </div>

      {onAddColor && showColor && (
        <div style={{ marginTop: 10 }}>
          <CustomColorPicker
            onAdd={(value, name) => {
              onAddColor(value, name);
              setShowColor(false);
            }}
          />
        </div>
      )}

      {onUploaded && (
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            if (files.length) beginUpload("background", files, (ids) => ids[0] && onUploaded(ids[0]));
            e.target.value = "";
          }}
        />
      )}
    </>
  );
}
