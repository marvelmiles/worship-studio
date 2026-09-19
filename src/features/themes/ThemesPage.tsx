import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Palette, Plus, RotateCcw, Trash2 } from "lucide-react";
import type { Background } from "../../types";
import { useUITheme } from "../../theme/ThemeProvider";
import { useStore } from "../../store/useStore";
import { useAttention } from "../../hooks/useAttention";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useViewport } from "../../hooks/useViewport";
import { useUndoRedoShortcuts } from "../../hooks/useUndoRedoShortcuts";
import {
  useUnsavedChanges,
  UNSAVED_CHANGES_MESSAGE,
} from "../../hooks/useUnsavedChanges";
import { Button, IconButton } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { EmptyState } from "../../components/ui/EmptyState";
import { EditorTopBar } from "../../components/layout/EditorTopBar";
import { PanelTabs, type PanelTab } from "../../components/ui/PanelTabs";
import { ThemeListPanel } from "./ThemeListPanel";
import { ThemeInspectorPanel } from "./ThemeInspectorPanel";
import { ThemePreviewPanel } from "./ThemePreviewPanel";
import { useThemeDraft } from "./useThemeDraft";
import routes from "../../routes";

const STACKED_WIDTH = 1080;
const COMPACT_WIDTH = 560;

const RESET_TITLE =
  "Put this default theme back to the font, colours, background and animation it shipped with";

type ThemesTab = "themes" | "preview" | "style";

const TABS: PanelTab<ThemesTab>[] = [
  { id: "themes", label: "Themes" },
  { id: "preview", label: "Preview" },
  { id: "style", label: "Style" },
];

export const ThemesPage = () => {
  const { colors } = useUITheme();
  const { themeId } = useParams();
  const navigate = useNavigate();
  const themes = useStore((s) => s.themes);
  const backgrounds = useStore((s) => s.backgrounds);
  const createTheme = useStore((s) => s.createTheme);
  const deleteTheme = useStore((s) => s.deleteTheme);
  const { width } = useViewport();
  const isStacked = width < STACKED_WIDTH;
  const compact = width < COMPACT_WIDTH;

  useDocumentTitle("Themes");

  const controller = useThemeDraft(themeId ?? null);
  const {
    draft,
    saved,
    dirty,
    nameError,
    canUndo,
    canRedo,
    canReset,
    patch,
    save,
    undo,
    redo,
    resetToDefaults,
  } = controller;

  useUndoRedoShortcuts({ canUndo, canRedo, undo, redo });

  const listRef = useRef<HTMLDivElement>(null);
  const [deepLinkedThemeId] = useState(themeId ?? null);
  const attentionId = useAttention(deepLinkedThemeId, listRef);
  const [tab, setTab] = useState<ThemesTab>("preview");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const leaveGuard = useUnsavedChanges(dirty);

  useEffect(() => {
    if (themeId || !saved) return;
    navigate(routes.theme(saved.id), { replace: true });
  }, [navigate, saved, themeId]);

  const backgroundById = useMemo(() => {
    const map: Record<string, Background> = {};
    for (const background of backgrounds) map[background.id] = background;
    return map;
  }, [backgrounds]);

  const addTheme = () => {
    const created = createTheme();
    if (!created) return;
    navigate(routes.theme(created.id));
    if (isStacked) setTab("preview");
  };

  const removeSelected = () => {
    setConfirmDelete(false);
    if (!saved || saved.builtIn) return;
    deleteTheme(saved.id);
    const next = themes.find((theme) => theme.id !== saved.id);
    navigate(next ? routes.theme(next.id) : routes.themes(), {
      replace: true,
    });
  };

  if (themes.length === 0)
    return (
      <div className="ws-page">
        <EmptyState
          icon={Palette}
          title="No themes yet"
          message="Create one to style every slide in a manuscript at once."
          action={
            <Button variant="primary" onClick={addTheme}>
              <Plus size={15} />
              New Theme
            </Button>
          }
        />
      </div>
    );

  const listPanel = (
    <ThemeListPanel
      ref={listRef}
      themes={themes}
      backgroundById={backgroundById}
      selectedId={saved?.id ?? null}
      attentionId={attentionId}
      onSelect={(id) => {
        navigate(routes.theme(id));
        if (isStacked) setTab("preview");
      }}
      onAdd={addTheme}
    />
  );

  const previewPanel = draft ? (
    <ThemePreviewPanel
      theme={draft}
      background={backgroundById[draft.backgroundId]}
    />
  ) : null;

  const inspectorPanel = <ThemeInspectorPanel controller={controller} />;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
      }}
    >
      <EditorTopBar
        title={draft?.name ?? ""}
        titleLabel="Theme name"
        compact={compact}
        dirty={dirty}
        titleError={nameError}
        invalid={Boolean(nameError)}
        invalidReason={nameError}
        onTitle={(name) => patch({ name }, { coalesceKey: "name" })}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onSave={save}
        saveLabel="Save theme"
        actions={
          <>
            {saved?.builtIn &&
              (compact ? (
                <IconButton
                  icon={RotateCcw}
                  title={RESET_TITLE}
                  disabled={!canReset}
                  onClick={() => setConfirmReset(true)}
                />
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  title={RESET_TITLE}
                  disabled={!canReset}
                  onClick={() => setConfirmReset(true)}
                >
                  <RotateCcw size={13} />
                  Reset to default
                </Button>
              ))}
            {saved && !saved.builtIn && (
              <IconButton
                icon={Trash2}
                title="Delete theme"
                danger
                onClick={() => setConfirmDelete(true)}
              />
            )}
            {compact ? (
              <IconButton icon={Plus} title="New theme" onClick={addTheme} />
            ) : (
              <Button variant="ghost" size="sm" onClick={addTheme}>
                <Plus size={14} />
                New Theme
              </Button>
            )}
          </>
        }
      />

      {isStacked ? (
        <>
          <PanelTabs
            tabs={TABS}
            value={tab}
            onChange={setTab}
            ariaLabel="Theme panels"
          />
          <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
            {tab === "themes" && listPanel}
            {tab === "preview" && previewPanel}
            {tab === "style" && inspectorPanel}
          </div>
        </>
      ) : (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: "292px 1fr 308px",
          }}
        >
          <div
            style={{
              overflow: "auto",
              borderRight: `1px solid ${colors.border}`,
            }}
          >
            {listPanel}
          </div>
          <div style={{ overflow: "auto" }}>{previewPanel}</div>
          <div
            style={{
              overflow: "auto",
              borderLeft: `1px solid ${colors.border}`,
            }}
          >
            {inspectorPanel}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmReset}
        title="Reset to default?"
        message={`"${saved?.name ?? ""}" goes back to the font, colours, background and animation it shipped with. Anything you changed here is replaced, and the reset only sticks once you save.`}
        confirmLabel="Reset to default"
        onConfirm={() => {
          setConfirmReset(false);
          resetToDefaults();
        }}
        onCancel={() => setConfirmReset(false)}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete theme"
        message={`Delete "${saved?.name ?? ""}"? Manuscripts using it fall back to another theme.`}
        confirmLabel="Delete theme"
        onConfirm={removeSelected}
        onCancel={() => setConfirmDelete(false)}
      />

      <ConfirmDialog
        open={leaveGuard.prompting}
        title="Unsaved changes"
        message={UNSAVED_CHANGES_MESSAGE}
        confirmLabel="Leave without saving"
        onConfirm={leaveGuard.discard}
        onCancel={leaveGuard.cancel}
      />
    </div>
  );
};
