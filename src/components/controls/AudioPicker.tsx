import { useRef } from "react";
import { Upload } from "lucide-react";
import type { AudioItem } from "../../types";
import { useStore } from "../../store/useStore";
import { useAssetUrl } from "../../hooks/useAssetUrl";
import { Field, Select } from "../ui/Field";
import { Button } from "../ui/Button";

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
  const selectedUrl = useAssetUrl(selected);

  const options = [
    { value: "", label: inheritLabel || "None" },
    ...audio.map((item) => ({ value: item.id, label: item.name })),
  ];

  return (
    <>
      <Field label="Background Audio">
        <Select value={value} options={options} onChange={(e) => onSelect(e.target.value)} />
      </Field>
      {selected && selectedUrl && (
        <audio src={selectedUrl} controls loop style={{ width: "100%", height: 34, marginBottom: 12 }} />
      )}
      {onUploaded && (
        <>
          <Button variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>
            <Upload size={14} />
            Upload audio
          </Button>
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
