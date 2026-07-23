import type { LucideIcon } from "lucide-react";

export interface PillTab<T extends string> {
  id: T;
  label: string;
  icon?: LucideIcon;
}

interface PillTabsProps<T extends string> {
  tabs: PillTab<T>[];
  value: T;
  onChange: (id: T) => void;
}

export function PillTabs<T extends string>({
  tabs,
  value,
  onChange,
}: PillTabsProps<T>) {
  return (
    <div className="ws-row-wrap" style={{ gap: 7 }}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = value === tab.id;
        return (
          <button
            key={tab.id}
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
}
