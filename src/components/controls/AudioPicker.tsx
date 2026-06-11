import { useRef } from "react";
import { Upload } from "lucide-react";
import type { AudioItem } from "../../types";
import { useStore } from "../../store/useStore";
import { Field, Select } from "../ui/Field";
import { Btn } from "../ui/Button";

interface AudioPickerProps {
  audio: AudioItem[];
  value: string;
  onSelect: (id: string) => void;
  inheritLabel?: string;
  onUploaded?: (id: string) => void;
}

export function AudioPicker({ audio, value, onSelect, inheritLabel, onUploaded }: AudioPickerProps) {
  const beginUpload = useStore((s) => s.beginUpload);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = audio.find((item) => item.id === value);

  const options = [
    { value: "", label: inheritLabel || "None" },
    ...audio.map((item) => ({ value: item.id, label: item.name })),
  ];

  return (
    <>
      <Field label="Background Audio">
        <Select value={value} options={options} onChange={(e) => onSelect(e.target.value)} />
      </Field>
      {selected && (
        <audio src={selected.dataUrl} controls loop style={{ width: "100%", height: 34, marginBottom: 12 }} />
      )}
      {onUploaded && (
        <>
          <Btn variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>
            <Upload size={14} />
            Upload audio
          </Btn>
          <input
            ref={inputRef}
            type="file"
            accept="audio/*"
            multiple
            hidden
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (files.length) beginUpload("audio", files, (ids) => ids[0] && onUploaded(ids[0]));
              e.target.value = "";
            }}
          />
        </>
      )}
    </>
  );
}
