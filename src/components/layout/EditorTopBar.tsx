import type { ReactNode } from "react";
import { ArrowLeft, MonitorUp, Play, Redo2, Save, Undo2 } from "lucide-react";
import { colors, DISPLAY } from "../../theme/tokens";
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
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  /** Only set while this document is the one being presented. */
  onUpdatePresentation?: () => void;
}

/**
 * The header every editor in the studio wears: where you came from, what you
 * are editing, undo and redo, and the three things you do with the result —
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
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSave,
  onUpdatePresentation,
}: EditorTopBarProps) {
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
      <input
        value={title}
        onChange={(event) => onTitle(event.target.value)}
        aria-label="Title"
        style={{
          flex: 1,
          minWidth: 120,
          background: "transparent",
          border: "none",
          outline: "none",
          fontFamily: DISPLAY,
          fontSize: compact ? 17 : 20,
          fontWeight: 600,
          color: colors.text,
        }}
      />
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
      {onUpdatePresentation &&
        (compact ? (
          <IconButton
            icon={MonitorUp}
            title="Update presentation"
            onClick={onUpdatePresentation}
          />
        ) : (
          <Button variant="ghost" size="sm" onClick={onUpdatePresentation}>
            <MonitorUp size={14} />
            Update presentation
          </Button>
        ))}
      {compact ? (
        <IconButton
          icon={Save}
          title={dirty ? "Save changes" : "No changes to save"}
          disabled={!dirty}
          active={dirty}
          onClick={onSave}
        />
      ) : (
        <Button
          variant={dirty ? "primary" : "ghost"}
          size="sm"
          disabled={!dirty}
          onClick={onSave}
        >
          <Save size={14} />
          {dirty ? "Save" : "Saved"}
        </Button>
      )}
      <PresentMenu onPresent={onPresent} title="Present">
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
