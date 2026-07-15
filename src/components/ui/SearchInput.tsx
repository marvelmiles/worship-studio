import { Search } from "lucide-react";
import type { CSSProperties } from "react";
import { C } from "../../theme/tokens";
import { TextInput } from "./Field";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  style?: CSSProperties;
}

export function SearchInput({ value, onChange, placeholder = "Search…", style }: SearchInputProps) {
  return (
    <div style={{ position: "relative", flex: 1, minWidth: 200, ...style }}>
      <Search size={16} style={{ position: "absolute", left: 13, top: 12, color: C.dim }} />
      <TextInput
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ paddingLeft: 38 }}
      />
    </div>
  );
}
