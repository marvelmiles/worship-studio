import { useUITheme } from "../../theme/ThemeProvider";
import { mix } from "../../theme/uiTheme";
import { SectionTitle } from "../../components/ui/Field";
import { getStorageLabel, type StorageInfo } from "../../lib/storageStats";

export const StorageSection = ({ storage }: { storage: StorageInfo }) => {
  const { colors, fonts } = useUITheme();
  const usedPercent = Math.min(100, Math.round(storage.pct * 100));
  const barColor =
    storage.level === "critical"
      ? colors.danger
      : storage.level === "warn"
        ? colors.warning
        : colors.success;

  return (
    <>
      <SectionTitle>Storage</SectionTitle>
      <div style={{ marginBottom: 18 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              fontFamily: fonts.display,
              fontSize: 20,
              fontWeight: 600,
              color: storage.level === "critical" ? colors.danger : colors.text,
              lineHeight: 1,
            }}
          >
            {usedPercent}%
          </div>
          <div
            style={{ fontFamily: fonts.ui, fontSize: 12, color: colors.sub }}
          >
            {getStorageLabel(storage)}
          </div>
        </div>
        <div
          style={{
            height: 7,
            borderRadius: 99,
            background: colors.raise,
            overflow: "hidden",
            marginTop: 9,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.max(2, usedPercent)}%`,
              borderRadius: 99,
              background: `linear-gradient(90deg, ${barColor}, ${mix(barColor, colors.onAccent, 0.28)})`,
              transition: "width 0.4s ease",
            }}
          />
        </div>
      </div>
    </>
  );
};
