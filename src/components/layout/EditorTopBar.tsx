import type { ReactNode } from "react";
import {
  ArrowLeft,
  MonitorDown,
  MonitorUp,
  Play,
  Redo2,
  Save,
  Undo2,
} from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import { useEditorShortcuts } from "../../hooks/useEditorShortcuts";
import { usePresentActions } from "../../hooks/usePresentActions";
import { EDITOR_COMMANDS } from "../../lib/shortcuts";
import { Button, IconButton } from "../ui/Button";
import { PresentMenu } from "../ui/PresentMenu";

const ignorePresent = () => {};

interface EditorTopBarProps {
  title: string;
  /** Left out where the title belongs to something else, such as an asset. */
  onTitle?: (title: string) => void;
  compact: boolean;
  titleLabel?: string;
  backTitle?: string;
  onBack?: () => void;
  leading?: ReactNode;
  onPresent?: (options: { pip: boolean }) => void;
  actions?: ReactNode;
  dirty: boolean;
  titleError?: string | null;
  invalid?: boolean;
  invalidReason?: string | null;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onSave: () => void;
  saveLabel?: string;
  savedLabel?: string;
  onUpdatePresentation?: () => void;
  onSyncFromPresentation?: () => void;
}

export const EditorTopBar = ({
  title,
  onTitle,
  compact,
  titleLabel = "Title",
  backTitle,
  onBack,
  leading,
  onPresent,
  actions,
  dirty,
  titleError,
  invalid,
  invalidReason,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSave,
  saveLabel = "Save",
  savedLabel = "Saved",
  onUpdatePresentation,
  onSyncFromPresentation,
}: EditorTopBarProps) => {
  const { colors, fonts } = useUITheme();
  const blocked = Boolean(invalid);
  const present = usePresentActions(onPresent ?? ignorePresent);
  const saveTitle = blocked
    ? (invalidReason ?? "Fix the highlighted fields to save")
    : dirty
      ? `Save changes (${EDITOR_COMMANDS.save.hint})`
      : "No changes to save";

  useEditorShortcuts({
    save: dirty || blocked ? onSave : undefined,
    updatePresentation: onUpdatePresentation,
    goLive: onPresent ? present.startLive : undefined,
    preview: onPresent ? present.startPreview : undefined,
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "11px 16px",
        borderBottom: `1px solid ${colors.border}`,
        flexWrap: "wrap",
      }}
    >
      {onBack && (
        <IconButton
          icon={ArrowLeft}
          title={backTitle ?? "Back"}
          onClick={onBack}
        />
      )}
      {leading}
      <div style={{ flex: 1, minWidth: 120 }}>
        {onTitle ? (
          <input
            value={title}
            onChange={(event) => onTitle(event.target.value)}
            aria-label={titleLabel}
            aria-invalid={titleError ? true : undefined}
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              borderBottom: `1px solid ${titleError ? colors.danger : "transparent"}`,
              outline: "none",
              fontFamily: fonts.display,
              fontSize: compact ? 17 : 20,
              fontWeight: 600,
              color: colors.text,
            }}
          />
        ) : (
          <h1
            className="ws-ellipsis"
            style={{
              margin: 0,
              fontFamily: fonts.display,
              fontSize: compact ? 17 : 20,
              fontWeight: 600,
              color: colors.text,
            }}
          >
            {title}
          </h1>
        )}
        {titleError && (
          <span
            role="alert"
            style={{
              display: "block",
              marginTop: 3,
              fontFamily: fonts.ui,
              fontSize: 11.5,
              lineHeight: 1.4,
              color: colors.danger,
            }}
          >
            {titleError}
          </span>
        )}
      </div>
      {onUndo && (
        <IconButton
          icon={Undo2}
          title="Undo (Ctrl+Z)"
          disabled={!canUndo}
          onClick={onUndo}
        />
      )}
      {onRedo && (
        <IconButton
          icon={Redo2}
          title="Redo (Ctrl+Y)"
          disabled={!canRedo}
          onClick={onRedo}
        />
      )}
      {actions}
      {onSyncFromPresentation &&
        (compact ? (
          <IconButton
            icon={MonitorDown}
            title="Sync with the presentation"
            onClick={onSyncFromPresentation}
          />
        ) : (
          <Button variant="ghost" size="sm" onClick={onSyncFromPresentation}>
            <MonitorDown size={14} />
            Sync with presentation
          </Button>
        ))}
      {onUpdatePresentation &&
        (compact ? (
          <IconButton
            icon={MonitorUp}
            title={`Update presentation (${EDITOR_COMMANDS.updatePresentation.hint})`}
            onClick={onUpdatePresentation}
          />
        ) : (
          <Button
            variant="ghost"
            size="sm"
            title={`Update presentation (${EDITOR_COMMANDS.updatePresentation.hint})`}
            onClick={onUpdatePresentation}
          >
            <MonitorUp size={14} />
            Update presentation
          </Button>
        ))}
      {compact ? (
        <IconButton
          icon={Save}
          title={saveTitle}
          disabled={!dirty || blocked}
          active={dirty && !blocked}
          onClick={onSave}
        />
      ) : (
        <Button
          variant={dirty && !blocked ? "primary" : "ghost"}
          size="sm"
          title={saveTitle}
          disabled={!dirty || blocked}
          onClick={onSave}
        >
          <Save size={14} />
          {dirty ? saveLabel : savedLabel}
        </Button>
      )}
      {onPresent && (
        <PresentMenu onPresent={onPresent} title="Present" hints>
          {compact ? (
            <IconButton icon={Play} title="Present" active />
          ) : (
            <Button variant="primary" size="sm">
              <Play size={14} />
              Present
            </Button>
          )}
        </PresentMenu>
      )}
    </div>
  );
};
