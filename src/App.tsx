import { useEffect } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";
import { fade } from "./theme/uiTheme";
import { useUITheme } from "./theme/ThemeProvider";
import { useStore } from "./store/useStore";
import { AppHeader } from "./components/layout/AppHeader";
import { Toaster } from "./components/ui/Toaster";
import { AlertBar } from "./components/ui/AlertBar";
import { StorageGate } from "./components/ui/StorageGate";
import { UploadLabelModal } from "./components/ui/UploadLabelModal";
import { ResetOverlay } from "./components/ui/ResetOverlay";
import { LoadingArea } from "./components/ui/Spinner";
import { GuideModal } from "./features/onboarding/GuideModal";
import { Dashboard } from "./features/dashboard/Dashboard";
import { ManuscriptLibrary } from "./features/manuscripts/ManuscriptLibrary";
import { ManuscriptEditor } from "./features/manuscripts/ManuscriptEditor";
import { BiblePage } from "./features/bible/BiblePage";
import { ScriptureEditor } from "./features/bible/ScriptureEditor";
import { ImagesPage, VideosPage } from "./features/media/MediaLibraryPage";
import { StreamPage } from "./features/stream/StreamPage";
import { StreamWindow } from "./features/stream/StreamWindow";
import { StreamProjectionRoot } from "./features/stream/StreamProjectionRoot";
import { Presentation } from "./features/presentation/Presentation";
import { PresentWindow } from "./features/presentation/PresentWindow";
import { AssetsModal } from "./features/assets/AssetsModal";
import { SettingsModal } from "./features/settings/SettingsModal";
import { ThemesModal } from "./features/themes/ThemesModal";
import { ShortcutsModal } from "./features/shortcuts/ShortcutsModal";
import { AboutModal } from "./features/about/AboutModal";
import { UpdateModal } from "./features/updates/UpdateModal";

/** Pre-rename editor URLs (bookmarks, history) land on the manuscript route. */
function LegacyManuscriptRedirect() {
  const { manuscriptId } = useParams();
  return <Navigate to={`/manuscripts/${manuscriptId}`} replace />;
}

export default function App() {
  const { colors, fonts } = useUITheme();
  const UI = fonts.ui;
  const load = useStore((s) => s.load);
  const loading = useStore((s) => s.loading);
  const presentation = useStore((s) => s.presentation);
  const location = useLocation();

  useEffect(() => {
    void load();
  }, [load]);

  if (location.pathname === "/present") return <PresentWindow />;
  if (location.pathname === "/stream-live") return <StreamWindow />;

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: `radial-gradient(1100px 520px at 80% -12%, ${fade(colors.accent, 0.1)}, transparent 65%), radial-gradient(1200px 500px at 50% -15%, rgba(255,255,255,0.02), transparent 70%), ${colors.bg}`,
        color: colors.text,
        fontFamily: UI,
        overflow: "hidden",
      }}
    >
      <AlertBar />
      <AppHeader />

      <main
        style={{
          flex: 1,
          minHeight: 0,
          overflowX: "hidden",
          overflowY:
            ["/editor", "/scripture", "/bible"].some((p) =>
              location.pathname.startsWith(p),
            ) || /^\/(manuscripts|songs)\/./.test(location.pathname)
              ? "hidden"
              : "auto",
        }}
      >
        {loading ? (
          <LoadingArea size={30} />
        ) : (
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/manuscripts" element={<ManuscriptLibrary />} />
            <Route
              path="/manuscripts/:manuscriptId"
              element={<ManuscriptEditor />}
            />
            <Route
              path="/songs"
              element={<Navigate to="/manuscripts" replace />}
            />
            <Route
              path="/songs/:manuscriptId"
              element={<LegacyManuscriptRedirect />}
            />
            <Route
              path="/library"
              element={<Navigate to="/manuscripts" replace />}
            />
            <Route path="/bible" element={<BiblePage />} />
            <Route path="/scripture/:passageId" element={<ScriptureEditor />} />
            <Route path="/images" element={<ImagesPage />} />
            <Route path="/videos" element={<VideosPage />} />
            <Route path="/stream" element={<StreamPage />} />
            <Route
              path="/editor/:manuscriptId"
              element={<LegacyManuscriptRedirect />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </main>

      {presentation && (
        <Presentation key={`${presentation.kind}:${presentation.id}`} />
      )}
      <StreamProjectionRoot />
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
