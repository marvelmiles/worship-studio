import { useRef } from "react";
import { Search } from "lucide-react";
import type { CSSProperties } from "react";
import { useUITheme } from "../../theme/ThemeProvider";
import { TextInput } from "./Field";
import { CLEAR_BUTTON_INSET, ClearInputButton } from "./ClearInputButton";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  style?: CSSProperties;
}

export const SearchInput = ({
  value,
  onChange,
  placeholder = "Search…",
  style,
}: SearchInputProps) => {
  const { colors } = useUITheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const filled = value.length > 0;

  const clear = () => {
    onChange("");
    inputRef.current?.focus();
  };

  return (
    <div style={{ position: "relative", flex: 1, minWidth: 200, ...style }}>
      <Search
        size={16}
        style={{ position: "absolute", left: 13, top: 12, color: colors.dim }}
      />
      <TextInput
        ref={inputRef}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && filled) {
            e.preventDefault();
            clear();
          }
        }}
        style={{
          paddingLeft: 38,
          paddingRight: filled ? CLEAR_BUTTON_INSET : undefined,
        }}
      />
      <ClearInputButton value={value} onClear={clear} />
    </div>
  );
};
