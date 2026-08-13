import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Copy,
  CornerDownRight,
  MonitorUp,
  Play,
  Redo2,
  Save,
  Scissors,
  Trash2,
  Undo2,
} from "lucide-react";
import type { ContentKind, SlideDeckDoc } from "../../types";
import { colors, DISPLAY, UI } from "../../theme/tokens";
import { useStore } from "../../store/useStore";
import { useViewport } from "../../hooks/useViewport";
import { useBgMap } from "../../hooks/useBgMap";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useTextFormatting } from "../../hooks/useTextFormatting";
import type { TextChangeMeta } from "../../hooks/useTextFormatting";
import {
  useUnsavedChanges,
  UNSAVED_CHANGES_MESSAGE,
} from "../../hooks/useUnsavedChanges";
import {
  resolveBackgroundView,
  resolveLineStyle,
  resolveStyle,
} from "../../lib/resolve";
import { computeTagGroups } from "../../lib/tagGroups";
import { Button, IconButton } from "../../components/ui/Button";
import { PresentMenu } from "../../components/ui/PresentMenu";
import { ContextMenu } from "../../components/ui/ContextMenu";
import type { MenuItem } from "../../components/ui/ContextMenu";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import type { DeckEditor } from "./useDeckEditor";
import { useFollowPresentation } from "./useFollowPresentation";
import { SlideListPanel } from "./SlideListPanel";
import { PreviewPanel } from "./PreviewPanel";
import { InspectorPanel } from "./InspectorPanel";
import type { SlideMediaEditing } from "./SlideMediaOverlay";

type MobileTab = "slides" | "edit" | "style";

interface ContextState {
  index: number;
  x: number;
  y: number;
}

interface DeckWorkspaceProps {
  doc: SlideDeckDoc;
  kind: ContentKind;
  editor: DeckEditor;
  backTo: string;
  backTitle: string;
  topBarActions: (compact: boolean) => ReactNode;
  emptyState: ReactNode;
  children?: ReactNode;
}

export function DeckWorkspace({
  doc,
  kind,
  editor,
  backTo,
  backTitle,
  topBarActions,
  emptyState,
  children,
}: DeckWorkspaceProps) {
  const navigate = useNavigate();
  const { width } = useViewport();
  const stacked = width < 1080;
  useDocumentTitle(`${doc.title} · WorshipStudio`);

  const themes = useStore((s) => s.themes);
  const backgrounds = useStore((s) => s.backgrounds);
  const audio = useStore((s) => s.audio);
  const startPresent = useStore((s) => s.startPresent);
  const updatePresentation = useStore((s) => s.updatePresentation);
  const presentation = useStore((s) => s.presentation);
  const addCustomBackground = useStore((s) => s.addCustomBackground);
  const pushToast = useStore((s) => s.pushToast);

  const tagGroups = useMemo(
    () => computeTagGroups(editor.slides),
    [editor.slides],
  );
  const theme = useMemo(
    () => themes.find((t) => t.id === doc.defaultThemeId) || themes[0],
    [themes, doc.defaultThemeId],
  );
  const bgMap = useBgMap();

  const [menu, setMenu] = useState<ContextState | null>(null);
  const [tab, setTab] = useState<MobileTab>("edit");
  const [lineScope, setLineScope] = useState(false);
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);

  const leaveGuard = useUnsavedChanges(editor.dirty);

  const slide = editor.selectedSlide;
  const slideId = slide?.id ?? null;

  // A placement belongs to the slide it sits on, so moving off it drops the
  // selection rather than leaving the inspector editing something unseen.
  useEffect(() => setSelectedMediaId(null), [slideId]);

  useFollowPresentation(kind, doc.id, editor.slides, editor.setSelectedId);

  const previewBackground = resolveBackgroundView(slide, doc, theme, bgMap);
  // True whether the presentation is projected or previewing on this screen.
  const isPresentingThisDoc =
    presentation?.kind === kind && presentation.id === doc.id;

  // The slide's lines edit as one block of text, so the formatting toolbar can
  // act on a selection that runs across several of them.
  const slideText = (slide?.lines ?? []).join("\n");
  const { setSlideText } = editor;
  const onSlideTextChange = useCallback(
    (text: string, meta: TextChangeMeta) => {
      if (!slideId) return;
      // A run of typing and a slider being dragged each fold into one step; a
      // formatting command is its own, so one undo takes exactly it back.
      const group = meta.coalesceKey ?? (meta.typing ? "typing" : null);
      setSlideText(slideId, text, {
        caret: meta.caret,
        coalesceKey: group ? `text:${slideId}:${group}` : undefined,
      });
    },
    [slideId, setSlideText],
  );

  const formatting = useTextFormatting({
    value: slideText,
    onChange: onSlideTextChange,
    history: editor.history,
  });

  // Line-scoped styling follows the caret, so the inspector always acts on the
  // line being written rather than on one picked earlier and left behind.
  const lineCount = slide?.lines.length ?? 0;
  const selectedLine =
    lineScope && lineCount
      ? Math.min(formatting.lines.first, lineCount - 1)
      : null;

  // Presenting from the editor shows what the operator is looking at, saved or
  // not: the run starts from the library copy, then the draft is pushed onto it.
  const present = ({ pip }: { pip: boolean }) => {
    startPresent(
      kind,
      doc.id,
      Math.max(0, editor.selectedIndex),
      pip ? "pip" : "stage",
    );
    updatePresentation(kind, doc);
  };

  // A refused save (storage full) raises its own alert from the store, so the
  // editor stays dirty and says nothing rather than claiming it wrote.
  const handleSave = () => {
    if (editor.save()) pushToast("Changes saved.");
  };

  const handleUpdatePresentation = () => {
    if (updatePresentation(kind, doc)) pushToast("Presentation updated.");
  };

  const menuItems: MenuItem[] = menu
    ? [
        {
          label: "Move up",
          icon: ArrowUp,
          fn: () => editor.moveSlide(menu.index, -1),
        },
        {
          label: "Move down",
          icon: ArrowDown,
          fn: () => editor.moveSlide(menu.index, 1),
        },
        { divider: true },
        {
          label: "Duplicate",
          icon: Copy,
          fn: () => editor.duplicateSlide(menu.index),
        },
        {
          label: "Insert after",
          icon: CornerDownRight,
          fn: () => editor.insertSlideAt(menu.index + 1),
        },
        {
          label: "Split",
          icon: Scissors,
          fn: () => editor.splitSlide(menu.index),
        },
        { divider: true },
        {
          label: "Delete",
          icon: Trash2,
          danger: true,
          fn: () => editor.removeSlide(menu.index),
        },
      ]
    : [];

  const listPanel = (
    <SlideListPanel
      slides={editor.slides}
      selectedId={editor.selectedId}
      setSelectedId={(id) => {
        editor.setSelectedId(id);
        setLineScope(false);
        if (stacked) setTab("edit");
      }}
      doc={doc}
      theme={theme}
      bgMap={bgMap}
      onReorder={editor.setSlides}
      onContextMenu={(index, x, y) => setMenu({ index, x, y })}
      onAdd={() =>
        editor.insertSlideAt(
          editor.selectedIndex >= 0
            ? editor.selectedIndex + 1
            : editor.slides.length,
        )
      }
      tagGroups={tagGroups}
    />
  );

  const mediaEditing: SlideMediaEditing = {
    selectedId: selectedMediaId,
    onSelect: setSelectedMediaId,
    onFrameChange: (mediaId, frame, gesture) => {
      if (!slideId) return;
      // One drag is one undo step, the way a slider drag is.
      editor.updateSlideMedia(
        slideId,
        mediaId,
        { frame },
        { coalesceKey: `media:${slideId}:${mediaId}:${gesture}` },
      );
    },
    onDuplicate: (mediaId) => {
      if (!slideId) return;
      const copyId = editor.duplicateSlideMedia(slideId, mediaId);
      if (copyId) setSelectedMediaId(copyId);
    },
    onDelete: (mediaId) => {
      if (!slideId) return;
      editor.removeSlideMedia(slideId, mediaId);
      setSelectedMediaId(null);
    },
    onReorder: (mediaId, direction) => {
      if (!slideId) return;
      editor.reorderSlideMedia(slideId, mediaId, direction);
    },
  };

  const previewPanel = slide ? (
    <PreviewPanel
      slide={slide}
      mediaEditing={mediaEditing}
      style={resolveStyle(slide, doc, theme)}
      lineStyles={slide.lines.map((_, i) =>
        resolveLineStyle(slide, i, doc, theme),
      )}
      background={previewBackground.background}
      backgroundImage={previewBackground.image}
      text={slideText}
      formatting={formatting}
      onChangeLabel={(label) =>
        editor.updateSlide(
          slide.id,
          { label },
          { coalesceKey: `label:${slide.id}` },
        )
      }
      selectedLine={selectedLine}
    />
  ) : (
    emptyState
  );

  const inspectorPanel = slide ? (
    <InspectorPanel
      editor={editor}
      doc={doc}
      theme={theme}
      backgrounds={backgrounds}
      audio={audio}
      onAddColor={addCustomBackground}
      selectedLine={selectedLine}
      onScopeToLine={setLineScope}
      formatting={formatting}
      selectedMediaId={selectedMediaId}
      onSelectMedia={setSelectedMediaId}
    />
  ) : null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
      }}
    >
      <TopBar
        title={doc.title}
        compact={width < 560}
        backTitle={backTitle}
        onBack={() => navigate(backTo)}
        onTitle={(title) =>
          editor.patchDoc({ title }, { coalesceKey: "title" })
        }
        onPresent={present}
        actions={topBarActions(width < 560)}
        dirty={editor.dirty}
        canUndo={editor.canUndo}
        canRedo={editor.canRedo}
        onUndo={formatting.undo}
        onRedo={formatting.redo}
        onSave={handleSave}
        onUpdatePresentation={
          isPresentingThisDoc ? handleUpdatePresentation : undefined
        }
      />

      {stacked ? (
        <>
          <TabBar tab={tab} setTab={setTab} hasSlide={Boolean(slide)} />
          <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
            {tab === "slides" && listPanel}
            {tab === "edit" && previewPanel}
            {tab === "style" && (inspectorPanel || emptyState)}
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

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={menuItems}
          onClose={() => setMenu(null)}
        />
      )}

      <ConfirmDialog
        open={leaveGuard.prompting}
        title="Unsaved changes"
        message={UNSAVED_CHANGES_MESSAGE}
        confirmLabel="Leave without saving"
        onConfirm={leaveGuard.discard}
        onCancel={leaveGuard.cancel}
      />

      {children}
    </div>
  );
}

interface TopBarProps {
  title: string;
  compact: boolean;
  backTitle: string;
  onBack: () => void;
  onTitle: (title: string) => void;
  onPresent: (options: { pip: boolean }) => void;
  actions: ReactNode;
  dirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  /** Only set while this document is the one being presented. */
  onUpdatePresentation?: () => void;
}

function TopBar({
  title,
  compact,
  backTitle,
  onBack,
  onTitle,
  onPresent,
  actions,
  dirty,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSave,
  onUpdatePresentation,
}: TopBarProps) {
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
        onChange={(e) => onTitle(e.target.value)}
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

function TabBar({
  tab,
  setTab,
  hasSlide,
}: {
  tab: MobileTab;
  setTab: (tab: MobileTab) => void;
  hasSlide: boolean;
}) {
  const tabs: { id: MobileTab; label: string }[] = [
    { id: "slides", label: "Slides" },
    { id: "edit", label: "Edit" },
    { id: "style", label: "Style" },
  ];
  return (
    <div
      style={{ display: "flex", borderBottom: `1px solid ${colors.border}` }}
    >
      {tabs.map(({ id, label }) => {
        const active = tab === id;
        const disabled = id === "style" && !hasSlide;
        return (
          <button
            key={id}
            disabled={disabled}
            onClick={() => setTab(id)}
            style={{
              flex: 1,
              padding: "12px 0",
              background: "transparent",
              border: "none",
              borderBottom: `2px solid ${active ? colors.accent : "transparent"}`,
              color: active
                ? colors.accentSoft
                : disabled
                  ? colors.dim
                  : colors.sub,
              fontFamily: UI,
              fontWeight: 600,
              fontSize: 13,
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
