import { useUITheme } from "../../theme/ThemeProvider";

export interface PanelTab<T extends string> {
  id: T;
  label: string;
  disabled?: boolean;
}

interface PanelTabsProps<T extends string> {
  tabs: PanelTab<T>[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel?: string;
}

export const PanelTabs = <T extends string>({
  tabs,
  value,
  onChange,
  ariaLabel,
}: PanelTabsProps<T>) => {
  const { colors, fonts } = useUITheme();
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      style={{ display: "flex", borderBottom: `1px solid ${colors.border}` }}
    >
      {tabs.map((tab) => {
        const active = value === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            style={{
              flex: 1,
              padding: "12px 0",
              background: "transparent",
              border: "none",
              borderBottom: `2px solid ${active ? colors.accent : "transparent"}`,
              color: active
                ? colors.accentSoft
                : tab.disabled
                  ? colors.dim
                  : colors.sub,
              fontFamily: fonts.ui,
              fontWeight: 600,
              fontSize: 13,
              cursor: tab.disabled ? "not-allowed" : "pointer",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
