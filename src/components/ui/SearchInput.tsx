import { Search } from "lucide-react";
import type { CSSProperties } from "react";
import { useUITheme } from "../../theme/ThemeProvider";
import { TextInput } from "./Field";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  style?: CSSProperties;
}

export function SearchInput({ value, onChange, placeholder = "Search…", style }: SearchInputProps) {
  const { colors } = useUITheme();
  return (
    <div style={{ position: "relative", flex: 1, minWidth: 200, ...style }}>
      <Search size={16} style={{ position: "absolute", left: 13, top: 12, color: colors.dim }} />
      <TextInput
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ paddingLeft: 38 }}
      />
    </div>
  );
}
