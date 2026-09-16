import type { MouseEvent } from "react";
import type { BibleVerse } from "../../../types";
import { useUITheme } from "../../../theme/ThemeProvider";
import { fade } from "../../../theme/uiTheme";

interface VerseRowProps {
  verse: BibleVerse;
  isSelected: boolean;
  isBeingRead: boolean;
  onRef: (element: HTMLDivElement | null) => void;
  onSelect: (extend: boolean) => void;
  onPresent: () => void;
}

export const VerseRow = ({
  verse,
  isSelected,
  isBeingRead,
  onRef,
  onSelect,
  onPresent,
}: VerseRowProps) => {
  const { colors, fonts } = useUITheme();
  const highlight = isSelected
    ? fade(colors.accent, 0.13)
    : isBeingRead
      ? fade(colors.info, 0.14)
      : "transparent";
  const outline = isSelected
    ? fade(colors.accent, 0.35)
    : isBeingRead
      ? fade(colors.info, 0.4)
      : "transparent";

  return (
    <div
      ref={onRef}
      onClick={(event: MouseEvent) =>
        onSelect(event.ctrlKey || event.metaKey || event.shiftKey)
      }
      onDoubleClick={onPresent}
      title="Click to select · Ctrl-click to extend · Shift+↑/↓ to grow · Double-click to present this verse"
      style={{
        display: "flex",
        gap: 12,
        padding: "9px 12px",
        borderRadius: 10,
        cursor: "pointer",
        marginBottom: 2,
        background: highlight,
        border: `1px solid ${outline}`,
        userSelect: "none",
      }}
    >
      <span
        style={{
          fontFamily: fonts.ui,
          fontSize: 12,
          fontWeight: 700,
          color: isSelected ? colors.accent : colors.dim,
          minWidth: 22,
          textAlign: "right",
          paddingTop: 3,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {verse.v}
      </span>
      <span
        style={{
          fontFamily: fonts.ui,
          fontSize: 15,
          lineHeight: 1.65,
          whiteSpace: "pre-line",
          color: isSelected || isBeingRead ? colors.text : colors.sub,
        }}
      >
        {verse.t}
      </span>
    </div>
  );
};
