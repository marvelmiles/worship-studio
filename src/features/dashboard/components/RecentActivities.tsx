import { Clock } from "lucide-react";
import { fade } from "../../../theme/tokens";
import { useUITheme } from "../../../theme/ThemeProvider";
import { EmptyState } from "../../../components/ui/EmptyState";
import { timeAgo } from "../utils";
import type { Activity } from "../utils";

interface RecentActivitiesProps {
  activities: Activity[];
}

export function RecentActivities({ activities }: RecentActivitiesProps) {
  const { colors, glass, fonts } = useUITheme();
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
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Clock size={16} color={colors.accent} /> Recent Activities
      </h3>
      {activities.length === 0 && (
        <EmptyState
          bare
          compact
          icon={Clock}
          title="No activity yet"
          message="Create a manuscript, read the Bible or upload media and it will show up here."
        />
      )}
      <div style={{ maxHeight: 520, overflowY: "auto" }}>
        {activities.map((a) => (
          <div
            key={a.key}
            onClick={a.open}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "11px 0",
              borderBottom: `1px solid ${colors.border}`,
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                display: "grid",
                placeItems: "center",
                background: fade(colors.accent, 0.12),
                color: colors.accentSoft,
                flexShrink: 0,
              }}
            >
              <a.icon size={16} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: UI,
                  fontWeight: 600,
                  fontSize: 14.5,
                  color: colors.text,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {a.title}
              </div>
              <div
                style={{
                  fontFamily: UI,
                  fontSize: 12.5,
                  color: colors.sub,
                }}
              >
                {a.detail}
              </div>
            </div>
            <span
              style={{
                fontFamily: UI,
                fontSize: 12,
                color: colors.dim,
                flexShrink: 0,
              }}
            >
              {timeAgo(a.at)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
