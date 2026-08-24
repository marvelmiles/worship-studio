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
import { colors, DISPLAY, UI } from "../../theme/tokens";
import { useEditorShortcuts } from "../../hooks/useEditorShortcuts";
import { usePresentActions } from "../../hooks/usePresentActions";
import { EDITOR_COMMANDS } from "../../lib/shortcuts";
import { Button, IconButton } from "../ui/Button";
import { PresentMenu } from "../ui/PresentMenu";

interface EditorTopBarProps {
  title: string;
  onTitle: (title: string) => void;
  /** Collapses the labelled buttons to icons on a narrow screen. */
  compact: boolean;
  backTitle: string;
  onBack: () => void;
  onPresent: (options: { pip: boolean }) => void;
  /** Editor-specific controls, dropped in before the shared ones. */
  actions?: ReactNode;
  dirty: boolean;
  /** Why the title can't be used, shown under it and holding the save back. */
  titleError?: string | null;
  /**
   * True while anything in the editor is refusing to be saved. The save control
   * says what is wrong rather than writing a document the operator would have
   * to find and fix later.
   */
  invalid?: boolean;
  /** The first thing wrong, used as the disabled save control's reason. */
  invalidReason?: string | null;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  /** Only set while this document is the one being presented. */
  onUpdatePresentation?: () => void;
  /**
   * Takes the running presentation's state back into the editor. Only set when
   * there is something live to take, which is a clip this editor is presenting.
   */
  onSyncFromPresentation?: () => void;
}

/**
 * The header every editor in the studio wears: where you came from, what you
 * are editing, undo and redo, and the three things you do with the result:
 * push it to the running presentation, save it, present it.
 */
export function EditorTopBar({
  title,
  onTitle,
  compact,
  backTitle,
  onBack,
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
  onUpdatePresentation,
  onSyncFromPresentation,
}: EditorTopBarProps) {
  const blocked = Boolean(invalid);
  const present = usePresentActions(onPresent);
  const saveTitle = blocked
    ? (invalidReason ?? "Fix the highlighted fields to save")
    : dirty
      ? `Save changes (${EDITOR_COMMANDS.save.hint})`
      : "No changes to save";

  // A refused save still runs, because the handler is what says why: pressing
  // the shortcut on a document with a bad field should answer, not do nothing.
  // A clean document has nothing to write, so the key only eats the browser's
  // own save dialog.
  useEditorShortcuts({
    save: dirty || blocked ? onSave : undefined,
    updatePresentation: onUpdatePresentation,
    goLive: present.startLive,
    preview: present.startPreview,
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
      <IconButton icon={ArrowLeft} title={backTitle} onClick={onBack} />
      <div style={{ flex: 1, minWidth: 120 }}>
        <input
          value={title}
          onChange={(event) => onTitle(event.target.value)}
          aria-label="Title"
          aria-invalid={titleError ? true : undefined}
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            borderBottom: `1px solid ${titleError ? colors.danger : "transparent"}`,
            outline: "none",
            fontFamily: DISPLAY,
            fontSize: compact ? 17 : 20,
            fontWeight: 600,
            color: colors.text,
          }}
        />
        {titleError && (
          <span
            role="alert"
            style={{
              display: "block",
              marginTop: 3,
              fontFamily: UI,
              fontSize: 11.5,
              lineHeight: 1.4,
              color: colors.danger,
            }}
          >
            {titleError}
          </span>
        )}
      </div>
      <IconButton
        icon={Undo2}
        title="Undo (Ctrl+Z)"
        disabled={!canUndo}
        onClick={onUndo}
      />
      <IconButton
        icon={Redo2}
        title="Redo (Ctrl+Y)"
        disabled={!canRedo}
        onClick={onRedo}
      />
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
          {dirty ? "Save" : "Saved"}
        </Button>
      )}
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
    </div>
  );
}
