import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { fade } from "./theme/uiTheme";
import { useUITheme } from "./theme/ThemeProvider";
import { useStore } from "./store/useStore";
import { AppHeader } from "./components/layout/AppHeader";
import { Toaster } from "./components/ui/Toaster";
import { AlertBar } from "./components/ui/AlertBar";
import { StorageGate } from "./components/ui/StorageGate";
import { UploadLabelModal } from "./components/ui/UploadLabelModal";
import { GoLiveTipDialog } from "./components/ui/GoLiveTipDialog";
import { ResetOverlay } from "./components/ui/ResetOverlay";
import { LoadingArea } from "./components/ui/Spinner";
import { GuideModal } from "./features/onboarding/GuideModal";
import { Dashboard } from "./features/dashboard/Dashboard";
import { ManuscriptLibrary } from "./features/manuscripts/ManuscriptLibrary";
import { ManuscriptEditor } from "./features/manuscripts/ManuscriptEditor";
import { BiblePage } from "./features/bible/BiblePage";
import { ScriptureEditor } from "./features/bible/ScriptureEditor";
import { ImagesPage, VideosPage } from "./features/media/MediaLibraryPage";
import {
  ImageEditorPage,
  VideoEditorPage,
} from "./features/media/MediaEditorPage";
import { StreamPage } from "./features/stream/StreamPage";
import { QuickSharePage } from "./features/share/QuickSharePage";
import { StreamWindow } from "./features/stream/StreamWindow";
import { StreamProjectionRoot } from "./features/stream/StreamProjectionRoot";
import { Presentation } from "./features/presentation/Presentation";
import { PresentWindow } from "./features/presentation/PresentWindow";
import { AssetsModal } from "./features/assets/AssetsModal";
import { AudioEditorPage } from "./features/assets/AudioEditorPage";
import { AssetUsageEditorPage } from "./features/assets/AssetUsageEditorPage";
import { SettingsModal } from "./features/settings/SettingsModal";
import { ThemesPage } from "./features/themes/ThemesPage";
import { ShortcutsModal } from "./features/shortcuts/ShortcutsModal";
import { AboutModal } from "./features/about/AboutModal";
import { UpdateModal } from "./features/updates/UpdateModal";
import routes, { isSelfScrollingRoute } from "./routes";
import { PlayGround } from "./Playground";

const App = () => {
  const { colors, fonts } = useUITheme();
  const UI = fonts.ui;
  const load = useStore((s) => s.load);
  const loading = useStore((s) => s.loading);
  const presentation = useStore((s) => s.presentation);
  const location = useLocation();

  useEffect(() => {
    void load();
  }, [load]);

  if (location.pathname === routes.presentWindow()) return <PresentWindow />;
  if (location.pathname === routes.streamWindow()) return <StreamWindow />;

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
          overflowY: isSelfScrollingRoute(location.pathname)
            ? "hidden"
            : "auto",
        }}
      >
        {loading ? (
          <LoadingArea size={30} />
        ) : (
          <Routes>
            <Route path="/playground" element={<PlayGround />} />
            <Route path={routes.dashboard()} element={<Dashboard />} />
            <Route
              path={routes.manuscripts()}
              element={<ManuscriptLibrary />}
            />
            <Route path={routes.manuscript()} element={<ManuscriptEditor />} />
            <Route path={routes.bible()} element={<BiblePage />} />
            <Route path={routes.passage()} element={<ScriptureEditor />} />
            <Route path={routes.images()} element={<ImagesPage />} />
            <Route path={routes.image()} element={<ImageEditorPage />} />
            <Route path={routes.videos()} element={<VideosPage />} />
            <Route path={routes.video()} element={<VideoEditorPage />} />
            <Route path={routes.sound()} element={<AudioEditorPage />} />
            <Route
              path={routes.assetUsage()}
              element={<AssetUsageEditorPage />}
            />
            <Route path={routes.themes()} element={<ThemesPage />} />
            <Route path={routes.theme()} element={<ThemesPage />} />
            <Route path={routes.stream()} element={<StreamPage />} />
            <Route path={routes.share()} element={<QuickSharePage />} />
            <Route
              path={routes.notFound()}
              element={<Navigate to={routes.dashboard()} replace />}
            />
          </Routes>
        )}
      </main>

      {presentation && (
        <Presentation key={`${presentation.kind}:${presentation.id}`} />
      )}
      <StreamProjectionRoot />
      <AssetsModal />
      <SettingsModal />
      <ShortcutsModal />
      <AboutModal />
      <UploadLabelModal />
      <GoLiveTipDialog />
      <GuideModal />
      <UpdateModal />
      <ResetOverlay />
      <StorageGate />
      <Toaster />
    </div>
  );
};

export default App;
