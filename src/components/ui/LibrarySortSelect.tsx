import { ArrowUpDown } from "lucide-react";
import { useMemo, type CSSProperties } from "react";
import { useUITheme } from "../../theme/ThemeProvider";
import {
  librarySortChoices,
  type LibrarySortOption,
} from "../../lib/librarySort";
import { Select } from "./Field";

interface LibrarySortSelectProps {
  value: LibrarySortOption;
  onChange: (value: LibrarySortOption) => void;
  /** The field this library orders by, named as the operator sees it. */
  nameLabel: string;
  style?: CSSProperties;
}

/** The one control that decides a library listing's order. */
export function LibrarySortSelect({
  value,
  onChange,
  nameLabel,
  style,
}: LibrarySortSelectProps) {
  const { colors } = useUITheme();
  const options = useMemo(() => librarySortChoices(nameLabel), [nameLabel]);
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
        options={options}
        onChange={(event) => onChange(event.target.value as LibrarySortOption)}
        style={{ paddingLeft: 38 }}
      />
    </div>
  );
}
