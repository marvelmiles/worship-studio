import { HardDrive } from "lucide-react";
import { fade } from "../../../theme/tokens";
import { useUITheme } from "../../../theme/ThemeProvider";
import { formatBytes } from "../../../lib/storageStats";
import type { StorageInfo } from "../../../lib/storageStats";

interface StorageCardProps {
  storage: StorageInfo;
}

export function StorageCard({ storage }: StorageCardProps) {
  const { colors, glass, fills, controls, fonts } = useUITheme();
  const UI = fonts.ui;
  const DISPLAY = fonts.display;

  return (
    <div style={{ ...glass, padding: "16px 20px", marginBottom: 26 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              display: "grid",
              placeItems: "center",
              background:
                storage.level === "critical"
                  ? fade(colors.danger, 0.14)
                  : storage.level === "warn"
                    ? fade(colors.warning, 0.14)
                    : fade(colors.success, 0.14),
              color:
                storage.level === "critical"
                  ? colors.danger
                  : storage.level === "warn"
                    ? colors.warning
                    : colors.success,
              flexShrink: 0,
            }}
          >
            <HardDrive size={19} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: UI,
                fontWeight: 600,
                fontSize: 14,
                color: colors.text,
              }}
            >
              Storage used
            </div>
            <div
              style={{
                fontFamily: UI,
                fontSize: 12,
                color: colors.sub,
                marginTop: 2,
              }}
            >
              {storage.blocked
                ? "Storage full. Delete songs, audio or backgrounds to continue"
                : storage.level === "critical"
                  ? "Critical: free up space soon"
                  : storage.level === "warn"
                    ? "Storage is filling up"
                    : "Plenty of space available"}
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right", fontFamily: UI }}>
          <div
            style={{
              fontFamily: DISPLAY,
              fontSize: 22,
              fontWeight: 600,
              color: storage.level === "critical" ? colors.danger : colors.text,
              lineHeight: 1,
            }}
          >
            {Math.min(100, Math.round(storage.pct * 100))}%
          </div>
          <div style={{ fontSize: 11.5, color: colors.dim, marginTop: 4 }}>
            {formatBytes(storage.userUsed)} used, about{" "}
            {formatBytes(Math.max(0, storage.userMax - storage.userUsed))} free
          </div>
        </div>
      </div>
      <div
        style={{
          height: 9,
          borderRadius: 99,
          background: controls.track,
          overflow: "hidden",
          marginTop: 13,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.max(2, Math.min(100, storage.pct * 100))}%`,
            borderRadius: 99,
            background:
              storage.level === "critical"
                ? fills.dangerBar
                : storage.level === "warn"
                  ? fills.accentBar
                  : fills.successBar,
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}
