import { useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Film, Image as ImageIcon, Undo2 } from "lucide-react";
import type { MediaItem, MediaKind } from "../../types";
import { useUITheme } from "../../theme/ThemeProvider";
import { useStore } from "../../store/useStore";
import { useViewport } from "../../hooks/useViewport";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useAutoHideChrome } from "../../hooks/useAutoHideChrome";
import { useMediaPlayback } from "../../hooks/useMediaPlayback";
import { useSpacePlayPause } from "../../hooks/useSpacePlayPause";
import { useValidation } from "../../hooks/useValidation";
import { useConfirmedAction } from "../../hooks/useConfirmedAction";
import { useUndoRedoShortcuts } from "../../hooks/useUndoRedoShortcuts";
import {
  useUnsavedChanges,
  UNSAVED_CHANGES_MESSAGE,
} from "../../hooks/useUnsavedChanges";
import { useBlobUrl } from "../../lib/blobUrls";
import { mediaSurfaceProps } from "../../lib/mediaKeys";
import { formatDuration } from "../../lib/media";
import { syncedPosition } from "../../lib/presentChannel";
import { formatBytes } from "../../lib/storageStats";
import { validateName } from "../../lib/validation";
import { Button, IconButton } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { MissingPage } from "../../components/ui/MissingPage";
import { EditorSplitLayout } from "../../components/layout/EditorSplitLayout";
import { EditorTopBar } from "../../components/layout/EditorTopBar";
import { ImageLayer } from "../../components/media/ImageLayer";
import { ImageSettingsControls } from "../../components/media/ImageSettingsControls";
import { VideoSettingsControls } from "../../components/media/VideoSettingsControls";
import { VideoSurface } from "../../components/media/VideoSurface";
import { VideoTransportBar } from "../../components/media/VideoTransportBar";
import { useMediaEditor } from "./useMediaEditor";
import { useEditorReturn } from "../assets/assetLibraryNavigation";
import routes from "../../routes";

const resetTitle = (canReset: boolean): string =>
  canReset
    ? "Put every adjustment back to the way this file started"
    : "Nothing to reset: every adjustment is already where it started";

const BACK_TITLE: Record<MediaKind, string> = {
  image: "Back to images",
  video: "Back to videos",
};

export const MediaEditorPage = ({ kind }: { kind: MediaKind }) => {
  const { mediaId } = useParams();
  const navigate = useNavigate();
  const item = useStore((s) =>
    s.media.find((entry) => entry.id === mediaId && entry.kind === kind),
  );
  const lastRef = useRef(item);
  if (item) lastRef.current = item;

  if (!lastRef.current)
    return (
      <MissingPage
        icon={kind === "image" ? ImageIcon : Film}
        title={kind === "image" ? "Image not found" : "Video not found"}
        message="It may have been deleted."
        actionLabel={BACK_TITLE[kind]}
        onAction={() => navigate(routes.mediaLibrary(kind))}
      />
    );

  return <MediaWorkspace key={lastRef.current.id} item={lastRef.current} />;
};

const MediaWorkspace = ({ item }: { item: MediaItem }) => {
  const { colors, fonts } = useUITheme();
  const editorReturn = useEditorReturn(
    routes.mediaLibrary(item.kind),
    item.id,
    BACK_TITLE[item.kind],
  );
  const { width } = useViewport();
  const stacked = width < 1080;
  const compact = width < 560;
  const pushToast = useStore((s) => s.pushToast);
  const stagePresenting = useStore(
    (s) => Boolean(s.presentation) && s.presentationMode === "stage",
  );
  const editor = useMediaEditor(item);
  const src = useBlobUrl(item.id);
  const leaveGuard = useUnsavedChanges(editor.dirty);
  const resetAll = useConfirmedAction(editor.resetSettings);
  const isImage = item.kind === "image";
  const validation = useValidation({
    name: validateName(
      editor.draft.name,
      isImage ? "image name" : "video name",
    ),
  });

  useDocumentTitle(editor.draft.name);

  const videoSettings = editor.draft.video;
  const video = useMediaPlayback(videoSettings, { autoPlay: false });
  const duration = item.duration || video.duration || 0;
  const trimEnd = videoSettings.trimEnd ?? duration;
  const surfaceRef = useRef<HTMLDivElement>(null);
  const chrome = useAutoHideChrome({ enabled: !isImage, surfaceRef });

  useUndoRedoShortcuts({
    canUndo: editor.canUndo,
    canRedo: editor.canRedo,
    undo: editor.undo,
    redo: editor.redo,
  });

  useSpacePlayPause({
    enabled: !isImage && !stagePresenting,
    toggle: video.togglePlaying,
  });

  const previewPlayback = useMemo(
    () => ({
      ...video.playback,
      volume: videoSettings.volume,
      muted: video.playback.muted || videoSettings.muted,
    }),
    [video.playback, videoSettings.volume, videoSettings.muted],
  );

  const refuse = () =>
    pushToast(validation.message ?? "Fix the highlighted fields.", "error");

  const handleSave = () => {
    if (validation.invalid) {
      refuse();
      return;
    }
    if (!editor.save()) return;
    pushToast(isImage ? "Image saved." : "Video saved.");
  };

  const handleUpdatePresentation = () => {
    if (validation.invalid) {
      refuse();
      return;
    }
    if (editor.updatePresentation()) pushToast("Presentation updated.");
  };

  const presentedVideo = editor.presentedVideo;
  const handleSyncFromPresentation = () => {
    if (!presentedVideo || !editor.adoptPresentation()) return;
    video.adopt({
      playing: presentedVideo.playback.playing,
      muted: false,
      volume: presentedVideo.playback.volume,
      time: syncedPosition(presentedVideo.sync),
    });
    pushToast("Synced with the presentation.");
  };

  const preview = (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: stacked ? 16 : 24,
        minHeight: 0,
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          ref={surfaceRef}
          {...(isImage ? {} : mediaSurfaceProps)}
          style={{
            position: "relative",
            width: "100%",
            maxHeight: "100%",
            aspectRatio: "16/9",
            borderRadius: 14,
            overflow: "hidden",
            border: `1px solid ${colors.border}`,
            background: "#000",
          }}
        >
          {isImage ? (
            <ImageLayer
              src={src}
              alt={item.name}
              settings={editor.draft.image}
            />
          ) : (
            <>
              <VideoSurface
                ref={video.surfaceRef}
                item={item}
                settings={videoSettings}
                playback={previewPlayback}
                onTimeUpdate={video.onTimeUpdate}
                onEnded={video.onEnded}
              />
              <VideoTransportBar
                playing={video.playback.playing}
                muted={previewPlayback.muted}
                volume={videoSettings.volume}
                time={video.time}
                start={videoSettings.trimStart}
                end={trimEnd}
                visible={chrome.visible}
                onHoverChange={chrome.onHoverChange}
                compact={compact}
                onTogglePlaying={video.togglePlaying}
                onRestart={video.restart}
                onToggleMuted={() =>
                  editor.patchVideo({ muted: !videoSettings.muted })
                }
                onVolume={(volume) => editor.patchVideo({ volume })}
                onSeek={video.seekTo}
                style={{
                  position: "absolute",
                  left: 12,
                  right: 12,
                  bottom: 12,
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );

  const sidebar = (
    <div style={{ padding: 18 }}>
      <p
        style={{
          fontFamily: fonts.ui,
          fontSize: 12,
          color: colors.dim,
          margin: "0 0 4px",
          lineHeight: 1.6,
        }}
      >
        {item.width && item.height ? `${item.width}×${item.height} · ` : ""}
        {formatBytes(item.size || 0)}
        {duration ? ` · ${formatDuration(duration)}` : ""}
      </p>
      {isImage ? (
        <ImageSettingsControls
          settings={editor.draft.image}
          onChange={editor.patchImage}
          narrow
        />
      ) : (
        <VideoSettingsControls
          settings={videoSettings}
          onChange={editor.patchVideo}
          duration={duration}
          playhead={video.time}
          onIssueChange={validation.reportIssue}
          narrow
        />
      )}
    </div>
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
      }}
    >
      <EditorTopBar
        title={editor.draft.name}
        onTitle={editor.setName}
        compact={compact}
        backTitle={editorReturn.backTitle}
        onBack={editorReturn.back}
        onPresent={editor.present}
        actions={
          compact ? (
            <IconButton
              icon={Undo2}
              title={resetTitle(editor.canResetSettings)}
              disabled={!editor.canResetSettings}
              onClick={resetAll.request}
            />
          ) : (
            <Button
              variant="ghost"
              size="sm"
              title={resetTitle(editor.canResetSettings)}
              disabled={!editor.canResetSettings}
              onClick={resetAll.request}
            >
              <Undo2 size={14} />
              Reset all
            </Button>
          )
        }
        dirty={editor.dirty}
        titleError={validation.messageFor("name")}
        invalid={validation.invalid}
        invalidReason={validation.message}
        canUndo={editor.canUndo}
        canRedo={editor.canRedo}
        onUndo={editor.undo}
        onRedo={editor.redo}
        onSave={handleSave}
        onUpdatePresentation={
          editor.isPresenting ? handleUpdatePresentation : undefined
        }
        onSyncFromPresentation={
          presentedVideo ? handleSyncFromPresentation : undefined
        }
      />

      <EditorSplitLayout
        stacked={stacked}
        preview={preview}
        sidebar={sidebar}
      />

      <ConfirmDialog
        open={resetAll.prompting}
        title="Reset all settings?"
        message="Every adjustment here goes back to the way it started. This can't be undone, and the reset only sticks once you save."
        confirmLabel="Reset all"
        onConfirm={resetAll.confirm}
        onCancel={resetAll.cancel}
      />

      <ConfirmDialog
        open={leaveGuard.prompting}
        title="Unsaved changes"
        message={UNSAVED_CHANGES_MESSAGE}
        confirmLabel="Leave without saving"
        onConfirm={leaveGuard.discard}
        onCancel={leaveGuard.cancel}
      />
    </div>
  );
};

export const ImageEditorPage = () => <MediaEditorPage kind="image" />;
export const VideoEditorPage = () => <MediaEditorPage kind="video" />;
