import {
  BookOpen,
  FileText,
  Film,
  Image as ImageIcon,
  Layers,
  Palette,
  Volume2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { fade } from "../../../theme/tokens";
import { useUITheme } from "../../../theme/ThemeProvider";
import type { DashboardCounts } from "../useDashboardData";

interface StatsGridProps {
  counts: DashboardCounts;
}

interface StatCard {
  label: string;
  value: number;
  icon: LucideIcon;
  color: string;
}

export function StatsGrid({ counts }: StatsGridProps) {
  const { colors, glass, charts, fonts } = useUITheme();
  const UI = fonts.ui;
  const DISPLAY = fonts.display;

  const stats: StatCard[] = [
    {
      label: "Manuscripts",
      value: counts.manuscripts,
      icon: FileText,
      color: charts[0],
    },
    {
      label: "Slides",
      value: counts.totalSlides,
      icon: Layers,
      color: charts[1],
    },
    {
      label: "Passages",
      value: counts.savedPassages,
      icon: BookOpen,
      color: charts[2],
    },
    {
      label: "Images",
      value: counts.imageCount,
      icon: ImageIcon,
      color: charts[3],
    },
    {
      label: "Videos",
      value: counts.videoCount,
      icon: Film,
      color: charts[4],
    },
    { label: "Themes", value: counts.themes, icon: Palette, color: charts[5] },
    { label: "Sounds", value: counts.sounds, icon: Volume2, color: charts[6] },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
        gap: 14,
        marginBottom: 26,
      }}
    >
      {stats.map((s) => (
        <div key={s.label} style={{ ...glass, padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                display: "grid",
                placeItems: "center",
                background: fade(s.color, 0.13),
                color: s.color,
                flexShrink: 0,
              }}
            >
              <s.icon size={20} />
            </div>
            <div>
              <div
                style={{
                  fontFamily: DISPLAY,
                  fontSize: 30,
                  fontWeight: 600,
                  color: colors.text,
                  lineHeight: 1,
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontFamily: UI,
                  fontSize: 13,
                  color: colors.sub,
                  marginTop: 5,
                }}
              >
                {s.label}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
