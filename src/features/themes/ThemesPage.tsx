import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Palette, Plus } from "lucide-react";
import type { Background } from "../../types";
import { useUITheme } from "../../theme/ThemeProvider";
import { useStore } from "../../store/useStore";
import { useAttention } from "../../hooks/useAttention";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useViewport } from "../../hooks/useViewport";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { PageHeader } from "../../components/ui/PageHeader";
import { ThemeCard } from "./ThemeCard";
import { THEMES_PATH, themePath } from "./themeRoutes";
import { ThemeEditorPanel } from "./ThemeEditorPanel";
import { useThemeDraft } from "./useThemeDraft";

const STACK_WIDTH = 900;

export const ThemesPage = () => {
  const { colors } = useUITheme();
  const { themeId } = useParams();
  const navigate = useNavigate();
  const themes = useStore((s) => s.themes);
  const backgrounds = useStore((s) => s.backgrounds);
  const createTheme = useStore((s) => s.createTheme);
  const deleteTheme = useStore((s) => s.deleteTheme);
  const { width } = useViewport();
  const stacked = width < STACK_WIDTH;

  useDocumentTitle("Themes · WorshipStudio");

  const controller = useThemeDraft(themeId ?? null);
  const selected = controller.saved;

  const listRef = useRef<HTMLDivElement>(null);
  const [deepLinkedThemeId] = useState(themeId ?? null);
  const attentionId = useAttention(deepLinkedThemeId, listRef);

  useEffect(() => {
    if (themeId || !selected) return;
    navigate(themePath(selected.id), { replace: true });
  }, [navigate, selected, themeId]);

  const backgroundById = useMemo(() => {
    const map: Record<string, Background> = {};
    for (const background of backgrounds) map[background.id] = background;
    return map;
  }, [backgrounds]);

  const addTheme = () => {
    const created = createTheme();
    if (created) navigate(themePath(created.id));
  };

  const removeSelected = () => {
    if (!selected || selected.builtIn) return;
    deleteTheme(selected.id);
    const next = themes.find((theme) => theme.id !== selected.id);
    navigate(next ? themePath(next.id) : THEMES_PATH, { replace: true });
  };

  const themeList = (
    <div
      ref={listRef}
      style={{
        display: "grid",
        gridTemplateColumns: stacked
          ? "repeat(auto-fill,minmax(150px,1fr))"
          : "1fr",
        gap: 8,
        maxHeight: stacked ? "none" : "calc(100dvh - 210px)",
        overflow: stacked ? "visible" : "auto",
        paddingRight: stacked ? 0 : 4,
      }}
    >
      {themes.map((theme) => (
        <ThemeCard
          key={theme.id}
          theme={theme}
          background={backgroundById[theme.backgroundId]}
          active={theme.id === selected?.id}
          attention={theme.id === attentionId}
          onSelect={() => navigate(themePath(theme.id))}
        />
      ))}
    </div>
  );

  return (
    <div className="ws-page">
      <PageHeader
        title="Themes"
        subtitle="A theme bundles the font, colors, background, animation and playback defaults that every slide using it follows."
        actions={
          <Button variant="primary" onClick={addTheme}>
            <Plus size={16} />
            New Theme
          </Button>
        }
      />

      {themes.length === 0 ? (
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
      ) : stacked ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {themeList}
          <ThemeEditorPanel controller={controller} onDelete={removeSelected} />
        </div>
      ) : (
        <div
          style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 24 }}
        >
          {themeList}
          <div
            style={{
              borderLeft: `1px solid ${colors.border}`,
              paddingLeft: 24,
              minWidth: 0,
            }}
          >
            <ThemeEditorPanel
              controller={controller}
              onDelete={removeSelected}
            />
          </div>
        </div>
      )}
    </div>
  );
};
