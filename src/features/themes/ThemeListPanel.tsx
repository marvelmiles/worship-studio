import { forwardRef } from "react";
import { Plus } from "lucide-react";
import type { Background, Theme } from "../../types";
import { useUITheme } from "../../theme/ThemeProvider";
import { IconButton } from "../../components/ui/Button";
import { ThemeCard } from "./ThemeCard";

interface ThemeListPanelProps {
  themes: Theme[];
  backgroundById: Record<string, Background>;
  selectedId: string | null;
  attentionId: string | null;
  onSelect: (themeId: string) => void;
  onAdd: () => void;
}

export const ThemeListPanel = forwardRef<HTMLDivElement, ThemeListPanelProps>(
  (
    { themes, backgroundById, selectedId, attentionId, onSelect, onAdd },
    ref,
  ) => {
    const { colors, fonts } = useUITheme();
    return (
      <div ref={ref} style={{ paddingBottom: 14 }}>
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 14px 10px",
            background: colors.bg,
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <span
            style={{
              fontFamily: fonts.ui,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              color: colors.dim,
            }}
          >
            Themes
          </span>
          <IconButton icon={Plus} title="New theme" onClick={onAdd} />
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))",
            gap: 8,
            padding: "12px 14px 0",
          }}
        >
          {themes.map((theme) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              background={backgroundById[theme.backgroundId]}
              active={theme.id === selectedId}
              attention={theme.id === attentionId}
              onSelect={() => onSelect(theme.id)}
            />
          ))}
        </div>
      </div>
    );
  },
);

ThemeListPanel.displayName = "ThemeListPanel";
