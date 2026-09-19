import type { LucideIcon } from "lucide-react";
import { fade } from "../../theme/uiTheme";
import { useUITheme } from "../../theme/ThemeProvider";
import { formatCount } from "../../lib/formatNumber";
import { pillTabId, pillTabPanelId } from "./tabPanel";

export interface SegmentedTab<T extends string> {
  id: T;
  label: string;
  icon?: LucideIcon;
  count?: number;
}

interface SegmentedTabsProps<T extends string> {
  tabs: SegmentedTab<T>[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel?: string;
  idPrefix?: string;
  minSegmentWidth?: number;
}

export const SegmentedTabs = <T extends string>({
  tabs,
  value,
  onChange,
  ariaLabel,
  idPrefix,
  minSegmentWidth = 124,
}: SegmentedTabsProps<T>) => {
  const { colors, fonts } = useUITheme();

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fit,minmax(${minSegmentWidth}px,1fr))`,
        gap: 5,
        padding: 5,
        borderRadius: 14,
        background: colors.raise,
        border: `1px solid ${colors.border}`,
      }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = value === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active}
            id={idPrefix ? pillTabId(idPrefix, tab.id) : undefined}
            aria-controls={
              idPrefix ? pillTabPanelId(idPrefix, tab.id) : undefined
            }
            onClick={() => onChange(tab.id)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              minWidth: 0,
              padding: "9px 12px",
              borderRadius: 10,
              cursor: "pointer",
              fontFamily: fonts.ui,
              fontSize: 12.5,
              fontWeight: 600,
              background: active ? fade(colors.accent, 0.18) : "transparent",
              border: `1px solid ${active ? fade(colors.accent, 0.42) : "transparent"}`,
              color: active ? colors.accentSoft : colors.sub,
              boxShadow: active
                ? `inset 0 1px 0 ${fade(colors.accentSoft, 0.2)}`
                : "none",
            }}
          >
            {Icon && <Icon size={15} style={{ flexShrink: 0 }} />}
            <span className="ws-ellipsis">{tab.label}</span>
            {tab.count !== undefined && (
              <span
                style={{
                  flexShrink: 0,
                  minWidth: 20,
                  padding: "1px 6px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                  background: active
                    ? fade(colors.accentSoft, 0.22)
                    : fade(colors.text, 0.08),
                  color: active ? colors.accentSoft : colors.dim,
                }}
              >
                {formatCount(tab.count)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
