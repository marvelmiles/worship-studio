import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import type { ContentKind, SlideDeckDoc } from "../../types";
import { useUITheme } from "../../theme/ThemeProvider";
import { useStore } from "../../store/useStore";
import { useViewport } from "../../hooks/useViewport";
import { useBgMap } from "../../hooks/useBgMap";
import { useBackgroundView } from "../../hooks/useBackgroundView";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useValidation } from "../../hooks/useValidation";
import {
  useUnsavedChanges,
  UNSAVED_CHANGES_MESSAGE,
} from "../../hooks/useUnsavedChanges";
import { resolveLineStyle, resolveStyle } from "../../lib/resolve";
import { computeTagGroups } from "../../lib/tagGroups";
import { slideTextMetrics, type SlideTextMetrics } from "../../lib/slideLayout";
import type { ReflowOptions } from "../../lib/slideReflow";
import { validateName } from "../../lib/validation";
import { DEFAULT_SLIDE_ELEMENTS } from "../../lib/slideElements";
import type { SlideElementCapabilities } from "../../lib/slideElements";
import { EditorTopBar } from "../../components/layout/EditorTopBar";
import { ContextMenu } from "../../components/ui/ContextMenu";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { useOpenAssetUsageEditor } from "../assets/assetUsageEdit";
import type { DeckEditor } from "./useDeckEditor";
import { useFollowPresentation } from "./useFollowPresentation";
import { useRefitOnTextSize } from "./useRefitOnTextSize";
import { SlideListPanel } from "./SlideListPanel";
import { PreviewPanel } from "./PreviewPanel";
import { InspectorPanel } from "./InspectorPanel";
import { slideMenuItems } from "./deckWorkspace/slideMenuItems";
import { useSlideElementEditing } from "./deckWorkspace/useSlideElementEditing";
import { useSlideTextSurface } from "./deckWorkspace/useSlideTextSurface";
import {
  WorkspaceTabBar,
  type WorkspaceTab,
} from "./deckWorkspace/WorkspaceTabBar";

const STACKED_WIDTH = 1080;
const COMPACT_WIDTH = 560;

const DOCUMENT_NOUN: Partial<Record<ContentKind, string>> = {
  manuscript: "manuscript",
  scripture: "passage",
};

const TITLE_LABEL: Partial<Record<ContentKind, string>> = {
  manuscript: "manuscript title",
  scripture: "passage title",
};

interface SlideMenuState {
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
  elements?: SlideElementCapabilities;
  /** How this document's slides are re-cut when its text size changes. */
  reflow?: ReflowOptions;
  /**
   * Re-cuts the slides for a new text size. Documents built from a source of
   * their own, such as a passage built from verses, pass their own so the cut
   * can fall inside a line rather than only between lines.
   */
  refit?: (metrics: SlideTextMetrics) => boolean;
  unsavedMessage?: string;
  children?: ReactNode;
}

export const DeckWorkspace = ({
  doc,
  kind,
  editor,
  backTo,
  backTitle,
  topBarActions,
  emptyState,
  elements = DEFAULT_SLIDE_ELEMENTS,
  reflow,
  refit,
  unsavedMessage = UNSAVED_CHANGES_MESSAGE,
  children,
}: DeckWorkspaceProps) => {
  const { colors } = useUITheme();
  const navigate = useNavigate();
  const { width } = useViewport();
  const isStacked = width < STACKED_WIDTH;
  useDocumentTitle(doc.title);

  const themes = useStore((s) => s.themes);
  const backgrounds = useStore((s) => s.backgrounds);
  const audio = useStore((s) => s.audio);
  const startPresent = useStore((s) => s.startPresent);
  const updatePresentation = useStore((s) => s.updatePresentation);
  const presentation = useStore((s) => s.presentation);
  const pushToast = useStore((s) => s.pushToast);

  const [slideMenu, setSlideMenu] = useState<SlideMenuState | null>(null);
  const [tab, setTab] = useState<WorkspaceTab>("edit");

  const tagGroups = useMemo(
    () => computeTagGroups(editor.slides),
    [editor.slides],
  );
  const theme = useMemo(
    () => themes.find((entry) => entry.id === doc.defaultThemeId) || themes[0],
    [themes, doc.defaultThemeId],
  );
  const bgMap = useBgMap();

  const { fontSize: docFontSize, lineHeight: docLineHeight } = resolveStyle(
    undefined,
    doc,
    theme,
  );
  const textMetrics = useMemo(
    () =>
      slideTextMetrics({ fontSize: docFontSize, lineHeight: docLineHeight }),
    [docFontSize, docLineHeight],
  );
  useRefitOnTextSize({
    metrics: textMetrics,
    reflow,
    refit: refit ?? editor.refitSlides,
    onRefit: () =>
      pushToast("Slides re-cut so the text keeps its space on screen."),
  });

  const documentNoun = DOCUMENT_NOUN[kind] ?? "document";
  const openAssetUsage = useOpenAssetUsageEditor({ kind, doc, editor });

  const leaveGuard = useUnsavedChanges(editor.dirty);
  const validation = useValidation({
    title: validateName(doc.title, TITLE_LABEL[kind] ?? "title"),
  });

  const slide = editor.selectedSlide;
  const slideId = slide?.id ?? null;
  const elementEditing = useSlideElementEditing(editor, slideId);
  const textSurface = useSlideTextSurface(
    editor,
    slide,
    elementEditing.pickedTextBoxId,
  );

  useFollowPresentation(kind, doc.id, editor.slides, editor.setSelectedId);

  const previewBackground = useBackgroundView(slide, doc, theme, bgMap);
  const isPresentingThisDoc =
    presentation?.kind === kind && presentation.id === doc.id;

  const present = ({ pip }: { pip: boolean }) => {
    startPresent(
      kind,
      doc.id,
      Math.max(0, editor.selectedIndex),
      pip ? "pip" : "stage",
    );
    updatePresentation(kind, doc);
  };

  const refuseInvalid = () =>
    pushToast(validation.message ?? "Fix the highlighted fields.", "error");

  const handleSave = () => {
    if (validation.invalid) {
      refuseInvalid();
      return;
    }
    if (editor.save()) pushToast("Changes saved.");
  };

  const handleUpdatePresentation = () => {
    if (validation.invalid) {
      refuseInvalid();
      return;
    }
    if (updatePresentation(kind, doc)) pushToast("Presentation updated.");
  };

  const listPanel = (
    <SlideListPanel
      slides={editor.slides}
      selectedId={editor.selectedId}
      setSelectedId={(id) => {
        editor.setSelectedId(id);
        textSurface.setLineScope(false);
        if (isStacked) setTab("edit");
      }}
      doc={doc}
      theme={theme}
      bgMap={bgMap}
      onReorder={editor.setSlides}
      onContextMenu={(index, x, y) => setSlideMenu({ index, x, y })}
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

  const previewPanel = slide ? (
    <PreviewPanel
      slide={slide}
      elementEditing={elementEditing.editing}
      style={resolveStyle(slide, doc, theme)}
      lineStyles={slide.lines.map((_, index) =>
        resolveLineStyle(slide, index, doc, theme),
      )}
      background={previewBackground.background}
      backgroundImage={previewBackground.image}
      backgroundVideo={previewBackground.video}
      text={textSurface.text}
      formatting={textSurface.formatting}
      onChangeLabel={(label) =>
        editor.updateSlide(
          slide.id,
          { label },
          { coalesceKey: `label:${slide.id}` },
        )
      }
      selectedLine={textSurface.selectedLine}
      activeTextBoxId={textSurface.activeTextBoxId}
      onActivateTextBox={elementEditing.activateTextBox}
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
      documentNoun={documentNoun}
      selectedLine={textSurface.selectedLine}
      onScopeToLine={textSurface.setLineScope}
      formatting={textSurface.formatting}
      selectedElement={elementEditing.selectedElement}
      onSelectElement={elementEditing.selectElement}
      activeTextBoxId={textSurface.activeTextBoxId}
      elements={elements}
      onAddTextBox={elementEditing.addTextBox}
      onEditAsset={(request, forSlideId) =>
        openAssetUsage(request, {
          label: forSlideId ? "this slide" : `this ${documentNoun}`,
          slideId: forSlideId,
        })
      }
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
      <EditorTopBar
        title={doc.title}
        compact={width < COMPACT_WIDTH}
        backTitle={backTitle}
        onBack={() => navigate(backTo)}
        onTitle={(title) =>
          editor.patchDoc({ title }, { coalesceKey: "title" })
        }
        onPresent={present}
        actions={topBarActions(width < COMPACT_WIDTH)}
        dirty={editor.dirty}
        titleError={validation.messageFor("title")}
        invalid={validation.invalid}
        invalidReason={validation.message}
        canUndo={editor.canUndo}
        canRedo={editor.canRedo}
        onUndo={textSurface.formatting.undo}
        onRedo={textSurface.formatting.redo}
        onSave={handleSave}
        onUpdatePresentation={
          isPresentingThisDoc ? handleUpdatePresentation : undefined
        }
      />

      {isStacked ? (
        <>
          <WorkspaceTabBar
            tab={tab}
            onChange={setTab}
            hasSlide={Boolean(slide)}
          />
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

      {slideMenu && (
        <ContextMenu
          x={slideMenu.x}
          y={slideMenu.y}
          items={slideMenuItems(editor, slideMenu.index)}
          onClose={() => setSlideMenu(null)}
        />
      )}

      <ConfirmDialog
        open={leaveGuard.prompting}
        title="Unsaved changes"
        message={unsavedMessage}
        confirmLabel="Leave without saving"
        onConfirm={leaveGuard.discard}
        onCancel={leaveGuard.cancel}
      />

      {children}
    </div>
  );
};
