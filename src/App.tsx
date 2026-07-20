import { useEffect } from "react";
import { Link, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import {
  BookOpen,
  Film,
  HelpCircle,
  Image as ImageIcon,
  Keyboard,
  LayoutDashboard,
  Music,
  Palette,
  Settings,
  Radio,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { fade } from "./theme/uiTheme";
import { useUITheme } from "./theme/ThemeProvider";
import { useStore } from "./store/useStore";
import { useViewport } from "./hooks/useViewport";
import { IconButton } from "./components/ui/Button";
import { Toaster } from "./components/ui/Toaster";
import { AlertBar } from "./components/ui/AlertBar";
import { StorageGate } from "./components/ui/StorageGate";
import { UploadLabelModal } from "./components/ui/UploadLabelModal";
import { ResetOverlay } from "./components/ui/ResetOverlay";
import { LoadingArea } from "./components/ui/Spinner";
import { GuideModal } from "./features/onboarding/GuideModal";
import { Dashboard } from "./features/dashboard/Dashboard";
import { Library } from "./features/library/Library";
import { Editor } from "./features/editor/Editor";
import { BiblePage } from "./features/bible/BiblePage";
import { ScriptureEditor } from "./features/bible/ScriptureEditor";
import { ImagesPage, VideosPage } from "./features/media/MediaLibraryPage";
import { StreamPage } from "./features/stream/StreamPage";
import { Presentation } from "./features/presentation/Presentation";
import { PresentWindow } from "./features/presentation/PresentWindow";
import { AssetsModal } from "./features/assets/AssetsModal";
import { SettingsModal } from "./features/settings/SettingsModal";
import { ThemesModal } from "./features/themes/ThemesModal";
import { ShortcutsModal } from "./features/shortcuts/ShortcutsModal";
import { AboutModal } from "./features/about/AboutModal";
import { UpdateModal } from "./features/updates/UpdateModal";

/** Old song-editor URLs (bookmarks, history) land on the new /songs/:songId route. */
function LegacyEditorRedirect() {
  const { songId } = useParams();
  return <Navigate to={`/songs/${songId}`} replace />;
}

const NAV: [string, string, LucideIcon][] = [
  ["/", "Dashboard", LayoutDashboard],
  ["/songs", "Songs", Music],
  ["/bible", "Bible", BookOpen],
  ["/images", "Images", ImageIcon],
  ["/videos", "Videos", Film],
  ["/stream", "Stream", Radio],
];

export default function App() {
  const { colors, fonts } = useUITheme();
  const UI = fonts.ui;
  const DISPLAY = fonts.display;
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
        background: `radial-gradient(1100px 520px at 80% -12%, rgba(124,58,237,0.17), transparent 65%), radial-gradient(900px 460px at 10% -14%, rgba(99,102,241,0.1), transparent 60%), radial-gradient(1200px 500px at 50% -15%, rgba(255,255,255,0.02), transparent 70%), ${colors.bg}`,
        color: colors.text,
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
          borderBottom: `1px solid ${colors.border}`,
          flexShrink: 0,
          background: "rgba(9,7,17,0.5)",
          backdropFilter: "blur(18px) saturate(150%)",
          WebkitBackdropFilter: "blur(18px) saturate(150%)",
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
            style={{ borderRadius: 9, boxShadow: `0 4px 16px ${fade(colors.accent, 0.25)}` }}
          />
          {!compact && (
            <div>
              <div
                style={{
                  fontFamily: DISPLAY,
                  fontSize: 18,
                  fontWeight: 600,
                  lineHeight: 1,
                  color: colors.text,
                }}
              >
                WorshipStudio
              </div>
              <div
                style={{
                  fontSize: 10.5,
                  color: colors.dim,
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
          {NAV.map(([path, label, Icon]) => {
            const active =
              path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);
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

      <main
        style={{
          flex: 1,
          minHeight: 0,
          overflowX: "hidden",
          overflowY:
            ["/editor", "/scripture", "/bible"].some((p) => location.pathname.startsWith(p)) ||
            /^\/songs\/./.test(location.pathname)
              ? "hidden"
              : "auto",
        }}
      >
        {loading ? (
          <LoadingArea size={30} />
        ) : (
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/songs" element={<Library />} />
            <Route path="/songs/:songId" element={<Editor />} />
            <Route path="/library" element={<Navigate to="/songs" replace />} />
            <Route path="/bible" element={<BiblePage />} />
            <Route path="/scripture/:passageId" element={<ScriptureEditor />} />
            <Route path="/images" element={<ImagesPage />} />
            <Route path="/videos" element={<VideosPage />} />
            <Route path="/stream" element={<StreamPage />} />
            <Route path="/editor/:songId" element={<LegacyEditorRedirect />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </main>

      {presentation && <Presentation key={`${presentation.kind}:${presentation.id}`} />}
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
