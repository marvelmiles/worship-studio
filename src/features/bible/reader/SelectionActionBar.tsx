import { BookmarkPlus, Pencil, Square, Volume2, X } from "lucide-react";
import type { PassageRange } from "../../../types";
import { useUITheme } from "../../../theme/ThemeProvider";
import { Button, IconButton } from "../../../components/ui/Button";
import type { ScriptureSelection } from "../../../store/useStore";
import { formatRange } from "../lib/reference";
import { PresentButton } from "../PresentButton";

interface SelectionActionBarProps {
  range: PassageRange;
  verseCount: number;
  buildSelection: () => ScriptureSelection | null;
  onEdit: () => void;
  isSpeechSupported: boolean;
  isSpeaking: boolean;
  onToggleReadAloud: () => void;
  onSave: () => void;
  onClear: () => void;
}

export const SelectionActionBar = ({
  range,
  verseCount,
  buildSelection,
  onEdit,
  isSpeechSupported,
  isSpeaking,
  onToggleReadAloud,
  onSave,
  onClear,
}: SelectionActionBarProps) => {
  const { colors, fonts, glass, shadows } = useUITheme();
  return (
    <div
      style={{
        position: "sticky",
        bottom: 10,
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
        padding: "10px 14px",
        borderRadius: 14,
        background: colors.panel,
        backdropFilter: glass.backdropFilter,
        WebkitBackdropFilter: glass.WebkitBackdropFilter,
        border: `1px solid ${colors.borderStrong}`,
        boxShadow: shadows.overlay,
      }}
    >
      <span
        style={{
          fontFamily: fonts.ui,
          fontSize: 13.5,
          fontWeight: 600,
          color: colors.accentSoft,
        }}
      >
        {formatRange(range)}
      </span>
      <span style={{ fontFamily: fonts.ui, fontSize: 12, color: colors.dim }}>
        {verseCount} verse{verseCount === 1 ? "" : "s"}
      </span>
      <span style={{ flex: 1 }} />
      <PresentButton selection={buildSelection} title="Present these verses" />
      <Button
        size="sm"
        variant="ghost"
        onClick={onEdit}
        title="Edit these verses as slides before presenting"
      >
        <Pencil size={13} />
        Edit
      </Button>
      {isSpeechSupported && (
        <Button size="sm" variant="ghost" onClick={onToggleReadAloud}>
          {isSpeaking ? <Square size={13} /> : <Volume2 size={13} />}
          {isSpeaking ? "Stop" : "Read"}
        </Button>
      )}
      <Button size="sm" variant="ghost" onClick={onSave}>
        <BookmarkPlus size={13} />
        Save passage
      </Button>
      <IconButton icon={X} title="Clear selection" onClick={onClear} />
    </div>
  );
};
