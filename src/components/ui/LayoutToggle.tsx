import { LayoutGrid, List } from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import type { LibraryLayout } from "../../hooks/useLibraryLayout";
import { IconButton } from "./Button";

interface LayoutToggleProps {
  value: LibraryLayout;
  onChange: (layout: LibraryLayout) => void;
  /** What is being listed, for the tooltips: "images", "manuscripts". */
  noun: string;
}

export const LayoutToggle = ({ value, onChange, noun }: LayoutToggleProps) => {
  const { colors } = useUITheme();
  return (
    <div
      role="group"
      aria-label="Layout"
      style={{
        display: "flex",
        gap: 4,
        padding: 4,
        borderRadius: 13,
        background: colors.raise,
        border: `1px solid ${colors.border}`,
      }}
    >
      <IconButton
        icon={LayoutGrid}
        size="sm"
        title={`Show ${noun} as cards`}
        active={value === "grid"}
        onClick={() => onChange("grid")}
      />
      <IconButton
        icon={List}
        size="sm"
        title={`Show ${noun} as a detailed list`}
        active={value === "list"}
        onClick={() => onChange("list")}
      />
    </div>
  );
};
