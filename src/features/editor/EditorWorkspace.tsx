import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Copy,
  CornerDownRight,
  Play,
  Scissors,
  Settings2,
  Trash2,
  Type,
} from "lucide-react";
import type { Background, Song } from "../../types";
import { C, DISPLAY, UI } from "../../theme/tokens";
import { useStore } from "../../store/useStore";
import { useViewport } from "../../hooks/useViewport";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { resolveBackground, resolveLineStyle, resolveStyle } from "../../lib/resolve";
import { computeTagGroups } from "../../lib/tagGroups";
import { Btn, IconBtn } from "../../components/ui/Button";
import { ContextMenu } from "../../components/ui/ContextMenu";
import type { MenuItem } from "../../components/ui/ContextMenu";
import { useEditorSong } from "./useEditorSong";
import { SlideListPanel } from "./SlideListPanel";
import { PreviewPanel } from "./PreviewPanel";
import { InspectorPanel } from "./InspectorPanel";
import { LyricsModal } from "./LyricsModal";
import { SongSettingsModal } from "./SongSettingsModal";

type MobileTab = "slides" | "edit" | "style";

interface ContextState {
  index: number;
  x: number;
  y: number;
}

export function EditorWorkspace({ song }: { song: Song }) {
  const navigate = useNavigate();
  const { width } = useViewport();
  const stacked = width < 1080;
  useDocumentTitle(`${song.title} — WorshipStudio`);

  const themes = useStore((s) => s.themes);
  const backgrounds = useStore((s) => s.backgrounds);
  const audio = useStore((s) => s.audio);
  const startPresent = useStore((s) => s.startPresent);
  const addCustomBackground = useStore((s) => s.addCustomBackground);

  const editor = useEditorSong(song);
  const tagGroups = useMemo(() => computeTagGroups(editor.slides), [editor.slides]);
  const theme = useMemo(
    () => themes.find((t) => t.id === song.defaultThemeId) || themes[0],
    [themes, song.defaultThemeId]
  );
  const bgMap = useMemo(() => {
    const map: Record<string, Background> = {};
    for (const bg of backgrounds) map[bg.id] = bg;
    return map;
  }, [backgrounds]);

  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menu, setMenu] = useState<ContextState | null>(null);
  const [tab, setTab] = useState<MobileTab>("edit");
  const [selectedLine, setSelectedLine] = useState<number | null>(null);

  const slide = editor.selectedSlide;
  const present = () => startPresent(song.id, Math.max(0, editor.selectedIndex));

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
      song={song}
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
      style={resolveStyle(slide, song, theme)}
      lineStyles={slide.lines.map((_, i) => resolveLineStyle(slide, i, song, theme))}
      background={resolveBackground(slide, song, theme, bgMap)}
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
    <EmptyState onEdit={() => setLyricsOpen(true)} />
  );

  const inspectorPanel = slide ? (
    <InspectorPanel
      editor={editor}
      song={song}
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
        song={song}
        compact={width < 560}
        onBack={() => navigate("/library")}
        onTitle={(title) => editor.patchSong({ title })}
        onLyrics={() => setLyricsOpen(true)}
        onSettings={() => setSettingsOpen(true)}
        onPresent={present}
      />

      {stacked ? (
        <>
          <TabBar tab={tab} setTab={setTab} hasSlide={Boolean(slide)} />
          <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
            {tab === "slides" && listPanel}
            {tab === "edit" && previewPanel}
            {tab === "style" && (inspectorPanel || <EmptyState onEdit={() => setLyricsOpen(true)} />)}
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
          <div style={{ overflow: "auto", borderRight: `1px solid ${C.border}` }}>{listPanel}</div>
          <div style={{ overflow: "auto" }}>{previewPanel}</div>
          <div style={{ overflow: "auto", borderLeft: `1px solid ${C.border}` }}>{inspectorPanel}</div>
        </div>
      )}

      {menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={() => setMenu(null)} />}

      <LyricsModal
        open={lyricsOpen}
        onClose={() => setLyricsOpen(false)}
        song={song}
        onRegenerate={editor.regenerateFromLyrics}
      />
      <SongSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        song={song}
        theme={theme}
        themes={themes}
        backgrounds={backgrounds}
        audio={audio}
        onPatchSong={editor.patchSong}
        onStyleChange={editor.updateSongStyle}
        onAddColor={addCustomBackground}
      />
    </div>
  );
}

interface TopBarProps {
  song: Song;
  compact: boolean;
  onBack: () => void;
  onTitle: (title: string) => void;
  onLyrics: () => void;
  onSettings: () => void;
  onPresent: () => void;
}

function TopBar({ song, compact, onBack, onTitle, onLyrics, onSettings, onPresent }: TopBarProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "11px 16px",
        borderBottom: `1px solid ${C.border}`,
        flexWrap: "wrap",
      }}
    >
      <IconBtn icon={ArrowLeft} title="Back to library" onClick={onBack} />
      <input
        value={song.title}
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
          color: C.text,
        }}
      />
      {compact ? (
        <>
          <IconBtn icon={Type} title="Edit lyrics" onClick={onLyrics} />
          <IconBtn icon={Settings2} title="Song settings" onClick={onSettings} />
          <IconBtn icon={Play} title="Present" onClick={onPresent} active />
        </>
      ) : (
        <>
          <Btn variant="ghost" size="sm" onClick={onLyrics}>
            <Type size={14} />
            Lyrics
          </Btn>
          <Btn variant="ghost" size="sm" onClick={onSettings}>
            <Settings2 size={14} />
            Song Settings
          </Btn>
          <Btn variant="primary" size="sm" onClick={onPresent}>
            <Play size={14} />
            Present
          </Btn>
        </>
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
    <div style={{ display: "flex", borderBottom: `1px solid ${C.border}` }}>
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
              borderBottom: `2px solid ${active ? C.gold : "transparent"}`,
              color: active ? C.goldSoft : disabled ? C.dim : C.sub,
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

function EmptyState({ onEdit }: { onEdit: () => void }) {
  return (
    <div style={{ height: "100%", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ textAlign: "center", maxWidth: 320 }}>
        <p style={{ fontFamily: UI, color: C.sub, lineHeight: 1.6 }}>
          This song has no slides yet. Add lyrics to generate slides automatically.
        </p>
        <Btn variant="primary" onClick={onEdit}>
          <Type size={15} />
          Edit lyrics
        </Btn>
      </div>
    </div>
  );
}
