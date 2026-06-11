import { Field, Select } from "../ui/Field";
import { ANIMATION_OPTIONS } from "../../lib/animation";

interface AnimationPickerProps {
  label?: string;
  value: string;
  onSelect: (value: string) => void;
  inheritLabel?: string;
}

export function AnimationPicker({ label = "Animation", value, onSelect, inheritLabel }: AnimationPickerProps) {
  const options = [
    ...(inheritLabel ? [{ value: "", label: inheritLabel }] : []),
    ...ANIMATION_OPTIONS,
  ];
  return (
    <Field label={label}>
      <Select value={value} options={options} onChange={(e) => onSelect(e.target.value)} />
    </Field>
  );
}
