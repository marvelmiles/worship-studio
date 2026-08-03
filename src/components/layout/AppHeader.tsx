import { Link, useLocation } from "react-router-dom";
import {
  BookOpen,
  FileText,
  Film,
  HelpCircle,
  Image as ImageIcon,
  Keyboard,
  LayoutDashboard,
  Palette,
  Radio,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { fade } from "../../theme/uiTheme";
import { useUITheme } from "../../theme/ThemeProvider";
import { useStore } from "../../store/useStore";
import { useViewport } from "../../hooks/useViewport";
import { IconButton } from "../ui/Button";

const NAV: [string, string, LucideIcon][] = [
  ["/", "Dashboard", LayoutDashboard],
  ["/manuscripts", "Manuscripts", FileText],
  ["/bible", "Bible", BookOpen],
  ["/images", "Images", ImageIcon],
  ["/videos", "Videos", Film],
  ["/stream", "Stream", Radio],
];

/** The app-shell top bar: brand link, primary navigation and the overlay
 *  actions (about, assets, themes, shortcuts, settings). Owns its own
 *  active-route detection and compact-viewport behaviour so the shell stays
 *  purely a layout container. */
export function AppHeader() {
  const { colors, fonts } = useUITheme();
  const UI = fonts.ui;
  const DISPLAY = fonts.display;
  const openOverlay = useStore((s) => s.openOverlay);
  const location = useLocation();
  const { width } = useViewport();
  const compact = width < 700;

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: compact ? 8 : 16,
        padding: compact ? "0 12px" : "0 22px",
        height: 58,
        borderBottom: `1px solid ${colors.border}`,
        flexShrink: 0,
        background: fade(colors.bg2, 0.8),
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <Link
        to="/"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 11,
          textDecoration: "none",
          minWidth: 0,
          flexShrink: 1,
        }}
      >
        <img
          src="/favicon.svg"
          alt="WorshipStudio logo"
          width={34}
          height={34}
          style={{
            borderRadius: 9,
            boxShadow: `0 4px 16px ${fade(colors.accent, 0.25)}`,
          }}
        />
        {!compact && (
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: DISPLAY,
                fontSize: 18,
                fontWeight: 600,
                lineHeight: 1.1,
                letterSpacing: -0.2,
                color: colors.text,
                whiteSpace: "nowrap",
              }}
            >
              WorshipStudio
            </div>
          </div>
        )}
      </Link>

      <nav
        style={{
          display: "flex",
          gap: 4,
          marginLeft: compact ? 0 : 12,
          flexShrink: 0,
        }}
      >
        {NAV.map(([path, label, Icon]) => {
          const active =
            path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(path);
          return (
            <Link
              key={path}
              to={path}
              title={label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: compact ? "8px 10px" : "8px 14px",
                borderRadius: 10,
                textDecoration: "none",
                fontFamily: UI,
                fontWeight: 600,
                fontSize: 13.5,
                background: active ? colors.raise : "transparent",
                border: `1px solid ${active ? colors.border : "transparent"}`,
                color: active ? colors.text : colors.sub,
              }}
            >
              <Icon size={16} />
              {!compact && label}
            </Link>
          );
        })}
      </nav>

      <div
        style={{
          marginLeft: "auto",
          display: "flex",
          gap: 4,
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <IconButton
          icon={HelpCircle}
          title="About & Help"
          onClick={() => openOverlay("about")}
        />
        <IconButton
          icon={ImageIcon}
          title="Asset library"
          onClick={() => openOverlay("assets")}
        />
        <IconButton
          icon={Palette}
          title="Themes"
          onClick={() => openOverlay("themes")}
        />
        <IconButton
          icon={Keyboard}
          title="Keyboard shortcuts"
          onClick={() => openOverlay("shortcuts")}
        />
        <IconButton
          icon={Settings}
          title="Settings"
          onClick={() => openOverlay("settings")}
        />
      </div>
    </header>
  );
}
