import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  Square,
  Volume2,
} from "lucide-react";
import { useUITheme } from "../../../theme/ThemeProvider";
import { Button, IconButton } from "../../../components/ui/Button";
import { TextInput } from "../../../components/ui/Field";

interface ChapterToolbarProps {
  reference: string;
  onReferenceChange: (value: string) => void;
  onJumpToReference: () => void;
  isAllSelected: boolean;
  onToggleSelectAll: () => void;
  isSpeechSupported: boolean;
  isSpeaking: boolean;
  onToggleReadAloud: () => void;
  chapterLabel: string;
  onPreviousChapter: () => void;
  onNextChapter: () => void;
}

export const ChapterToolbar = ({
  reference,
  onReferenceChange,
  onJumpToReference,
  isAllSelected,
  onToggleSelectAll,
  isSpeechSupported,
  isSpeaking,
  onToggleReadAloud,
  chapterLabel,
  onPreviousChapter,
  onNextChapter,
}: ChapterToolbarProps) => {
  const { colors, fonts } = useUITheme();
  return (
    <div className="ws-row-wrap" style={{ marginBottom: 14 }}>
      <div style={{ position: "relative", flex: 1, minWidth: 190 }}>
        <TextInput
          value={reference}
          placeholder="Go to reference, like John 3:16-18"
          onChange={(event) => onReferenceChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onJumpToReference();
          }}
        />
      </div>
      <Button
        variant="ghost"
        onClick={onJumpToReference}
        title="Go to reference"
      >
        <ArrowRight size={15} />
        Go
      </Button>
      <span style={{ flex: 1 }} />
      <div className="ws-row" style={{ gap: 6 }}>
        <IconButton
          icon={ListChecks}
          title={
            isAllSelected
              ? "Deselect all verses (Ctrl+A)"
              : "Select all verses (Ctrl+A)"
          }
          active={isAllSelected}
          onClick={onToggleSelectAll}
        />
        {isSpeechSupported && (
          <IconButton
            icon={isSpeaking ? Square : Volume2}
            title={isSpeaking ? "Stop reading" : "Read chapter aloud"}
            active={isSpeaking}
            onClick={onToggleReadAloud}
          />
        )}
        <IconButton
          icon={ChevronLeft}
          title="Previous chapter"
          onClick={onPreviousChapter}
        />
        <span
          style={{
            fontFamily: fonts.display,
            fontSize: 17,
            fontWeight: 600,
            color: colors.text,
            minWidth: 130,
            textAlign: "center",
          }}
        >
          {chapterLabel}
        </span>
        <IconButton
          icon={ChevronRight}
          title="Next chapter"
          onClick={onNextChapter}
        />
      </div>
    </div>
  );
};
