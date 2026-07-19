import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Copy,
  CornerDownRight,
  Play,
  Scissors,
  Trash2,
} from "lucide-react";
import type { ContentKind, SlideDeckDoc } from "../../types";
import { colors, DISPLAY, UI } from "../../theme/tokens";
import { useStore } from "../../store/useStore";
import { useViewport } from "../../hooks/useViewport";
import { useBgMap } from "../../hooks/useBgMap";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { resolveBackground, resolveLineStyle, resolveStyle } from "../../lib/resolve";
import { computeTagGroups } from "../../lib/tagGroups";
import { Button, IconButton } from "../../components/ui/Button";
import { ContextMenu } from "../../components/ui/ContextMenu";
import type { MenuItem } from "../../components/ui/ContextMenu";
import type { DeckEditor } from "./useDeckEditor";
import { SlideListPanel } from "./SlideListPanel";
import { PreviewPanel } from "./PreviewPanel";
import { InspectorPanel } from "./InspectorPanel";

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
  const addCustomBackground = useStore((s) => s.addCustomBackground);

  const tagGroups = useMemo(() => computeTagGroups(editor.slides), [editor.slides]);
  const theme = useMemo(
    () => themes.find((t) => t.id === doc.defaultThemeId) || themes[0],
    [themes, doc.defaultThemeId]
  );
  const bgMap = useBgMap();

  const [menu, setMenu] = useState<ContextState | null>(null);
  const [tab, setTab] = useState<MobileTab>("edit");
  const [selectedLine, setSelectedLine] = useState<number | null>(null);

  const slide = editor.selectedSlide;
  const present = () => startPresent(kind, doc.id, Math.max(0, editor.selectedIndex));

  // A line selection only makes sense for the current slide's current line count.
  useEffect(() => {
    if (selectedLine !== null && (!slide || selectedLine >= slide.lines.length)) {
      setSelectedLine(null);
    }
  }, [slide, selectedLine]);

  const menuItems: MenuItem[] = menu
    ? [
        { label: "Move up", icon: ArrowUp, fn: () => editor.moveSlide(menu.index, -1) },
        { label: "Move down", icon: ArrowDown, fn: () => editor.moveSlide(menu.index, 1) },
        { divider: true },
        { label: "Duplicate", icon: Copy, fn: () => editor.duplicateSlide(menu.index) },
        { label: "Insert after", icon: CornerDownRight, fn: () => editor.insertSlideAt(menu.index + 1) },
        { label: "Split", icon: Scissors, fn: () => editor.splitSlide(menu.index) },
        { divider: true },
        { label: "Delete", icon: Trash2, danger: true, fn: () => editor.removeSlide(menu.index) },
      ]
    : [];

  const listPanel = (
    <SlideListPanel
      slides={editor.slides}
      selectedId={editor.selectedId}
      setSelectedId={(id) => {
        editor.setSelectedId(id);
        setSelectedLine(null);
        if (stacked) setTab("edit");
      }}
      doc={doc}
      theme={theme}
      bgMap={bgMap}
      onReorder={editor.setSlides}
      onContextMenu={(index, x, y) => setMenu({ index, x, y })}
      onAdd={() => editor.insertSlideAt(editor.selectedIndex >= 0 ? editor.selectedIndex + 1 : editor.slides.length)}
      tagGroups={tagGroups}
    />
  );

  const previewPanel = slide ? (
    <PreviewPanel
      slide={slide}
      style={resolveStyle(slide, doc, theme)}
      lineStyles={slide.lines.map((_, i) => resolveLineStyle(slide, i, doc, theme))}
      background={resolveBackground(slide, doc, theme, bgMap)}
      onChangeLines={(lines) => {
        const lineOverrides = slide.lineOverrides
          ? Object.fromEntries(
              Object.entries(slide.lineOverrides).filter(([i]) => Number(i) < lines.length)
            )
          : undefined;
        editor.updateSlide(slide.id, { lines, lineOverrides });
      }}
      onChangeLabel={(label) => editor.updateSlide(slide.id, { label })}
      selectedLine={selectedLine}
      onSelectLine={setSelectedLine}
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
      onSelectLine={setSelectedLine}
    />
  ) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <TopBar
        title={doc.title}
        compact={width < 560}
        backTitle={backTitle}
        onBack={() => navigate(backTo)}
        onTitle={(title) => editor.patchDoc({ title })}
        onPresent={present}
        actions={topBarActions(width < 560)}
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
          <div style={{ overflow: "auto", borderRight: `1px solid ${colors.border}` }}>{listPanel}</div>
          <div style={{ overflow: "auto" }}>{previewPanel}</div>
          <div style={{ overflow: "auto", borderLeft: `1px solid ${colors.border}` }}>{inspectorPanel}</div>
        </div>
      )}

      {menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={() => setMenu(null)} />}

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
  onPresent: () => void;
  actions: ReactNode;
}

function TopBar({ title, compact, backTitle, onBack, onTitle, onPresent, actions }: TopBarProps) {
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
      {actions}
      {compact ? (
        <IconButton icon={Play} title="Present" onClick={onPresent} active />
      ) : (
        <Button variant="primary" size="sm" onClick={onPresent}>
          <Play size={14} />
          Present
        </Button>
      )}
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
    <div style={{ display: "flex", borderBottom: `1px solid ${colors.border}` }}>
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
              color: active ? colors.accentSoft : disabled ? colors.dim : colors.sub,
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
