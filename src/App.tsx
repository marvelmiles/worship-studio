import { useEffect } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import {
  HelpCircle,
  Image as ImageIcon,
  Keyboard,
  LayoutDashboard,
  Library as LibraryIcon,
  Music,
  Palette,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { C, DISPLAY, UI } from "./theme/tokens";
import { useStore } from "./store/useStore";
import { useViewport } from "./hooks/useViewport";
import { IconBtn } from "./components/ui/Button";
import { Toaster } from "./components/ui/Toaster";
import { AlertBar } from "./components/ui/AlertBar";
import { StorageGate } from "./components/ui/StorageGate";
import { UploadLabelModal } from "./components/ui/UploadLabelModal";
import { ResetOverlay } from "./components/ui/ResetOverlay";
import { GuideModal } from "./features/onboarding/GuideModal";
import { Dashboard } from "./features/dashboard/Dashboard";
import { Library } from "./features/library/Library";
import { Editor } from "./features/editor/Editor";
import { Presentation } from "./features/presentation/Presentation";
import { PresentWindow } from "./features/presentation/PresentWindow";
import { AssetsModal } from "./features/assets/AssetsModal";
import { SettingsModal } from "./features/settings/SettingsModal";
import { ThemesModal } from "./features/themes/ThemesModal";
import { ShortcutsModal } from "./features/shortcuts/ShortcutsModal";
import { AboutModal } from "./features/about/AboutModal";
import { UpdateModal } from "./features/updates/UpdateModal";

const NAV: [string, string, LucideIcon][] = [
  ["/", "Dashboard", LayoutDashboard],
  ["/library", "Library", LibraryIcon],
];

export default function App() {
  const load = useStore((s) => s.load);
  const loading = useStore((s) => s.loading);
  const presentation = useStore((s) => s.presentation);
  const openOverlay = useStore((s) => s.openOverlay);
  const location = useLocation();
  const { width } = useViewport();
  const compact = width < 700;

  useEffect(() => {
    void load();
  }, [load]);

  if (location.pathname === "/present") return <PresentWindow />;

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: `radial-gradient(1200px 600px at 80% -10%, rgba(216,162,74,0.07), transparent), radial-gradient(900px 500px at 10% 110%, rgba(80,116,168,0.06), transparent), ${C.bg}`,
        color: C.text,
        fontFamily: UI,
        overflow: "hidden",
      }}
    >
      <AlertBar />
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: compact ? 8 : 16,
          padding: compact ? "0 12px" : "0 22px",
          height: 58,
          borderBottom: `1px solid ${C.border}`,
          flexShrink: 0,
          background: "rgba(13,12,17,0.6)",
          backdropFilter: "blur(10px)",
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
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: `linear-gradient(140deg,${C.goldSoft},${C.gold})`,
              display: "grid",
              placeItems: "center",
              color: "#231a08",
              boxShadow: "0 4px 16px rgba(216,162,74,0.3)",
            }}
          >
            <Music size={18} />
          </div>
          {!compact && (
            <div>
              <div
                style={{
                  fontFamily: DISPLAY,
                  fontSize: 18,
                  fontWeight: 600,
                  lineHeight: 1,
                  color: C.text,
                }}
              >
                WorshipStudio
              </div>
              <div
                style={{
                  fontSize: 10.5,
                  color: C.dim,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                Presentation Studio
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
          {NAV.map(([path, label, Ico]) => {
            const active = location.pathname === path;
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
                  background: active ? C.raise : "transparent",
                  border: `1px solid ${active ? C.border : "transparent"}`,
                  color: active ? C.text : C.sub,
                }}
              >
                <Ico size={16} />
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
          <IconBtn
            icon={HelpCircle}
            title="About & Help"
            onClick={() => openOverlay("about")}
          />
          <IconBtn
            icon={ImageIcon}
            title="Asset library"
            onClick={() => openOverlay("assets")}
          />
          <IconBtn
            icon={Palette}
            title="Themes"
            onClick={() => openOverlay("themes")}
          />
          <IconBtn
            icon={Keyboard}
            title="Keyboard shortcuts"
            onClick={() => openOverlay("shortcuts")}
          />
          <IconBtn
            icon={Settings}
            title="Settings"
            onClick={() => openOverlay("settings")}
          />
        </div>
      </header>

      <main
        style={{
          flex: 1,
          minHeight: 0,
          overflowX: "hidden",
          overflowY: location.pathname.startsWith("/editor")
            ? "hidden"
            : "auto",
        }}
      >
        {loading ? (
          <div
            style={{
              display: "grid",
              placeItems: "center",
              height: "100%",
              color: C.dim,
              fontFamily: UI,
            }}
          >
            Loading library…
          </div>
        ) : (
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/library" element={<Library />} />
            <Route path="/editor/:songId" element={<Editor />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </main>

      {presentation && <Presentation />}
      <AssetsModal />
      <SettingsModal />
      <ThemesModal />
      <ShortcutsModal />
      <AboutModal />
      <UploadLabelModal />
      <GuideModal />
      <UpdateModal />
      <ResetOverlay />
      <StorageGate />
      <Toaster />
    </div>
  );
}
