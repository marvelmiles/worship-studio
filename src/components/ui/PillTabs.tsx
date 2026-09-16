import type { LucideIcon } from "lucide-react";
import { pillTabId, pillTabPanelId } from "./tabPanel";

export interface PillTab<T extends string> {
  id: T;
  label: string;
  icon?: LucideIcon;
}

interface PillTabsProps<T extends string> {
  tabs: PillTab<T>[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel?: string;
  idPrefix?: string;
}

export const PillTabs = <T extends string>({
  tabs,
  value,
  onChange,
  ariaLabel,
  idPrefix,
}: PillTabsProps<T>) => {
  return (
    <div
      className="ws-row-wrap"
      style={{ gap: 7 }}
      role="tablist"
      aria-label={ariaLabel}
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
            className={`ws-pill${active ? " ws-pill-active" : ""}`}
            style={
              Icon
                ? { display: "inline-flex", alignItems: "center", gap: 7 }
                : undefined
            }
          >
            {Icon && <Icon size={14} />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
