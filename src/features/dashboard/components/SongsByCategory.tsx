import { Music } from "lucide-react";
import { useUITheme } from "../../../theme/ThemeProvider";
import { EmptyState } from "../../../components/ui/EmptyState";
import { rankBarStyle } from "../utils";
import type { CategoryUsage } from "../useDashboardData";

interface SongsByCategoryProps {
  data: CategoryUsage[];
  largest: number;
}

export function SongsByCategory({ data, largest }: SongsByCategoryProps) {
  const { colors, glass, controls, fonts } = useUITheme();
  const UI = fonts.ui;
  const DISPLAY = fonts.display;

  return (
    <div style={{ ...glass, padding: 22 }}>
      <h3
        style={{
          margin: "0 0 14px",
          fontFamily: DISPLAY,
          fontSize: 18,
          color: colors.text,
        }}
      >
        Songs by Category
      </h3>
      {data.length === 0 && (
        <EmptyState
          bare
          compact
          icon={Music}
          title="No categories yet"
          message="Give your songs a category and the breakdown appears here."
        />
      )}
      {data.map((c, rank) => (
        <div key={c.name} style={{ marginBottom: 11 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontFamily: UI,
              fontSize: 13,
              color: colors.sub,
              marginBottom: 5,
            }}
          >
            <span>{c.name}</span>
            <span style={{ color: colors.text }}>{c.count}</span>
          </div>
          <div
            style={{
              height: 7,
              borderRadius: 99,
              background: controls.track,
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${(c.count / largest) * 100}%`,
                borderRadius: 99,
                ...rankBarStyle(colors.accent, colors.accentSoft, rank),
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
