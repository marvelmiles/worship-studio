import { ArrowUpDown } from "lucide-react";
import type { CSSProperties } from "react";
import { useUITheme } from "../../theme/ThemeProvider";
import {
  LIBRARY_SORT_CHOICES,
  type LibrarySortOption,
} from "../../lib/librarySort";
import { Select } from "./Field";

interface LibrarySortSelectProps {
  value: LibrarySortOption;
  onChange: (value: LibrarySortOption) => void;
  style?: CSSProperties;
}

/** The one control that decides a library listing's order. */
export function LibrarySortSelect({
  value,
  onChange,
  style,
}: LibrarySortSelectProps) {
  const { colors } = useUITheme();
  return (
    <div style={{ position: "relative", minWidth: 190, ...style }}>
      <ArrowUpDown
        size={15}
        style={{
          position: "absolute",
          left: 13,
          top: 13,
          color: colors.dim,
          pointerEvents: "none",
        }}
      />
      <Select
        value={value}
        aria-label="Sort by"
        options={LIBRARY_SORT_CHOICES}
        onChange={(event) => onChange(event.target.value as LibrarySortOption)}
        style={{ paddingLeft: 38 }}
      />
    </div>
  );
}
