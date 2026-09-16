import { useUITheme } from "../../../theme/ThemeProvider";

export type WorkspaceTab = "slides" | "edit" | "style";

const TABS: { id: WorkspaceTab; label: string }[] = [
  { id: "slides", label: "Slides" },
  { id: "edit", label: "Edit" },
  { id: "style", label: "Style" },
];

interface WorkspaceTabBarProps {
  tab: WorkspaceTab;
  onChange: (tab: WorkspaceTab) => void;
  hasSlide: boolean;
}

export const WorkspaceTabBar = ({
  tab,
  onChange,
  hasSlide,
}: WorkspaceTabBarProps) => {
  const { colors, fonts } = useUITheme();
  return (
    <div
      style={{ display: "flex", borderBottom: `1px solid ${colors.border}` }}
    >
      {TABS.map(({ id, label }) => {
        const isActive = tab === id;
        const isDisabled = id === "style" && !hasSlide;
        return (
          <button
            key={id}
            disabled={isDisabled}
            onClick={() => onChange(id)}
            style={{
              flex: 1,
              padding: "12px 0",
              background: "transparent",
              border: "none",
              borderBottom: `2px solid ${isActive ? colors.accent : "transparent"}`,
              color: isActive
                ? colors.accentSoft
                : isDisabled
                  ? colors.dim
                  : colors.sub,
              fontFamily: fonts.ui,
              fontWeight: 600,
              fontSize: 13,
              cursor: isDisabled ? "not-allowed" : "pointer",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};
