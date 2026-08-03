import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  FileText,
  Film,
  Image as ImageIcon,
  Palette,
  Plus,
  Upload,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { fade } from "../../../theme/tokens";
import { useUITheme } from "../../../theme/ThemeProvider";
import { useStore } from "../../../store/useStore";

interface QuickAction {
  label: string;
  sub: string;
  icon: LucideIcon;
  onClick: () => void;
  primary?: boolean;
}

export function QuickActions() {
  const theme = useUITheme();
  const { colors, glass, fills, fonts } = theme;
  const UI = fonts.ui;
  const navigate = useNavigate();
  const createManuscript = useStore((s) => s.createManuscript);
  const openOverlay = useStore((s) => s.openOverlay);

  const onNew = () => {
    const created = createManuscript();
    if (created) navigate(`/manuscripts/${created.id}`);
  };

  const actions: QuickAction[] = [
    {
      label: "New Manuscript",
      sub: "Create a new manuscript",
      icon: Plus,
      onClick: onNew,
      primary: true,
    },
    {
      label: "Open Bible",
      sub: "Browse Bible",
      icon: BookOpen,
      onClick: () => navigate("/bible"),
    },
    {
      label: "Manuscripts",
      sub: "Open the library",
      icon: FileText,
      onClick: () => navigate("/manuscripts"),
    },
    {
      label: "Images",
      sub: "Manage images",
      icon: ImageIcon,
      onClick: () => navigate("/images"),
    },
    {
      label: "Videos",
      sub: "Manage videos",
      icon: Film,
      onClick: () => navigate("/videos"),
    },
    {
      label: "Manage Themes",
      sub: "Customize themes",
      icon: Palette,
      onClick: () => openOverlay("themes"),
    },
    {
      label: "Upload Assets",
      sub: "Add your media",
      icon: Upload,
      onClick: () => openOverlay("assets"),
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
        gap: 14,
        marginBottom: 30,
      }}
    >
      {actions.map((a) => (
        <button
          key={a.label}
          onClick={a.onClick}
          style={{
            ...glass,
            padding: "20px",
            textAlign: "left",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 14,
            border: a.primary
              ? `1px solid ${fade(colors.accentSoft, 0.45)}`
              : `1px solid ${colors.border}`,
            background: a.primary ? fills.ctaCard : colors.panel,
            boxShadow: a.primary
              ? `${theme.shadows.cta}, inset 0 1px 0 rgba(255,255,255,0.12)`
              : glass.boxShadow,
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.transform = "translateY(-2px)")
          }
          onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              display: "grid",
              placeItems: "center",
              background: a.primary ? "rgba(255,255,255,0.16)" : colors.raise,
              color: a.primary ? "#ffffff" : colors.text,
            }}
          >
            <a.icon size={21} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: UI,
                fontWeight: 600,
                fontSize: 15,
                color: a.primary ? colors.onAccent : colors.text,
              }}
            >
              {a.label}
            </div>
            <div
              style={{
                fontFamily: UI,
                fontSize: 12.5,
                marginTop: 3,
                color: a.primary ? "rgba(255,255,255,0.75)" : colors.sub,
              }}
            >
              {a.sub}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
