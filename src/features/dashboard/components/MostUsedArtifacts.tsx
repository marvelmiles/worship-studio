import { useState } from "react";
import { Layers, Volume2 } from "lucide-react";
import { fade } from "../../../theme/tokens";
import { useUITheme } from "../../../theme/ThemeProvider";
import { EmptyState } from "../../../components/ui/EmptyState";
import { BgSwatch } from "../../../components/controls/BgSwatch";
import { rankBarStyle } from "../utils";
import type { UsageTab, UsedItem } from "../utils";

interface MostUsedArtifactsProps {
  mostUsed: Record<UsageTab, UsedItem[]>;
}

const USAGE_TABS: { id: UsageTab; label: string }[] = [
  { id: "background", label: "Backgrounds" },
  { id: "theme", label: "Themes" },
  { id: "sound", label: "Sounds" },
];

export function MostUsedArtifacts({ mostUsed }: MostUsedArtifactsProps) {
  const { colors, glass, controls, fonts } = useUITheme();
  const UI = fonts.ui;
  const DISPLAY = fonts.display;
  const [usageTab, setUsageTab] = useState<UsageTab>("background");

  const mostUsedList = mostUsed[usageTab];
  const highestUseCount = Math.max(1, ...mostUsedList.map((m) => m.count));

  return (
    <div style={{ ...glass, padding: 22 }}>
      <h3
        style={{
          margin: "0 0 12px",
          fontFamily: DISPLAY,
          fontSize: 18,
          color: colors.text,
        }}
      >
        Most Used Artifacts
      </h3>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {USAGE_TABS.map((t) => {
          const activeTab = usageTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setUsageTab(t.id)}
              style={{
                flex: 1,
                padding: "7px 0",
                borderRadius: 9,
                cursor: "pointer",
                fontFamily: UI,
                fontSize: 12.5,
                fontWeight: 600,
                border: `1px solid ${activeTab ? fade(colors.accent, 0.4) : colors.border}`,
                background: activeTab
                  ? fade(colors.accent, 0.16)
                  : "transparent",
                color: activeTab ? colors.accentSoft : colors.sub,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {mostUsedList.length === 0 ? (
        <EmptyState
          bare
          compact
          icon={Layers}
          title="Nothing used yet"
          message="This fills in as you build manuscripts with themes, backgrounds and sounds."
        />
      ) : (
        mostUsedList.map((item, rank) => (
          <div
            key={item.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              padding: "8px 0",
            }}
          >
            {item.bg ? (
              <BgSwatch
                bg={item.bg}
                style={{
                  width: 46,
                  height: 27,
                  borderRadius: 6,
                  flexShrink: 0,
                  overflow: "hidden",
                  border: `1px solid ${colors.border}`,
                }}
              />
            ) : (
              <div
                style={{
                  width: 46,
                  height: 27,
                  borderRadius: 6,
                  flexShrink: 0,
                  display: "grid",
                  placeItems: "center",
                  background: fade(colors.accent, 0.14),
                  border: `1px solid ${colors.border}`,
                  color: colors.accentSoft,
                }}
              >
                <Volume2 size={14} />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: UI,
                  fontSize: 13.5,
                  color: colors.text,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {item.name}
              </div>
              <div
                style={{
                  height: 5,
                  borderRadius: 99,
                  background: controls.track,
                  marginTop: 4,
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${(item.count / highestUseCount) * 100}%`,
                    borderRadius: 99,
                    ...rankBarStyle(colors.accent, colors.accentSoft, rank),
                  }}
                />
              </div>
            </div>
            <span
              style={{
                fontFamily: UI,
                fontSize: 12.5,
                color: colors.sub,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              ×{item.count}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
