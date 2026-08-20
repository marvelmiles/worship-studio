import { useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Undo2 } from "lucide-react";
import type { MediaItem, MediaKind } from "../../types";
import { colors, DISPLAY, UI } from "../../theme/tokens";
import { useStore } from "../../store/useStore";
import { useViewport } from "../../hooks/useViewport";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useAutoHideChrome } from "../../hooks/useAutoHideChrome";
import { useMediaPlayback } from "../../hooks/useMediaPlayback";
import { useSpacePlayPause } from "../../hooks/useSpacePlayPause";
import { useValidation } from "../../hooks/useValidation";
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
import { EditorTopBar } from "../../components/layout/EditorTopBar";
import { ImageLayer } from "../../components/media/ImageLayer";
import { ImageSettingsControls } from "../../components/media/ImageSettingsControls";
import { VideoSettingsControls } from "../../components/media/VideoSettingsControls";
import { VideoSurface } from "../../components/media/VideoSurface";
import { VideoTransportBar } from "../../components/media/VideoTransportBar";
import { useMediaEditor } from "./useMediaEditor";

const LIBRARY_PATH: Record<MediaKind, string> = {
  image: "/images",
  video: "/videos",
};

const BACK_TITLE: Record<MediaKind, string> = {
  image: "Back to images",
  video: "Back to videos",
};

/**
 * The editor a picture or a clip opens into: the media itself on the left at
 * the size it will be looked at, every setting in the sidebar beside it, and
 * the studio's own editor header over both, so tuning a clip works the way
 * writing a manuscript does.
 */
export function MediaEditorPage({ kind }: { kind: MediaKind }) {
  const { mediaId } = useParams();
  const navigate = useNavigate();
  const item = useStore((s) =>
    s.media.find((entry) => entry.id === mediaId && entry.kind === kind),
  );
  // Keeps the last known copy so a deletion from elsewhere unmounts cleanly
  // instead of crashing mid-edit.
  const lastRef = useRef(item);
  if (item) lastRef.current = item;

  if (!lastRef.current) {
    const label = kind === "image" ? "Image" : "Video";
    return (
      <div
        style={{
          height: "100%",
          display: "grid",
          placeItems: "center",
          padding: 24,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontFamily: DISPLAY, color: colors.text }}>
            {label} not found
          </h2>
          <p style={{ fontFamily: UI, color: colors.sub }}>
            It may have been deleted.
          </p>
          <Button
            variant="primary"
            onClick={() => navigate(LIBRARY_PATH[kind])}
          >
            <ArrowLeft size={15} />
            {BACK_TITLE[kind]}
          </Button>
        </div>
      </div>
    );
  }

  return <MediaWorkspace key={lastRef.current.id} item={lastRef.current} />;
}

function MediaWorkspace({ item }: { item: MediaItem }) {
  const navigate = useNavigate();
  const { width } = useViewport();
  const stacked = width < 1080;
  const compact = width < 560;
  const pushToast = useStore((s) => s.pushToast);
  // A presentation filling the screen owns the keyboard outright; the floating
  // presenter only does while it holds focus, which the space hook reads off
  // the event itself.
  const stagePresenting = useStore(
    (s) => Boolean(s.presentation) && s.presentationMode === "stage",
  );
  const editor = useMediaEditor(item);
  const src = useBlobUrl(item.id);
  const leaveGuard = useUnsavedChanges(editor.dirty);
  const isImage = item.kind === "image";
  const validation = useValidation({
    name: validateName(
      editor.draft.name,
      isImage ? "image name" : "video name",
    ),
  });

  useDocumentTitle(`${editor.draft.name} · WorshipStudio`);

  const videoSettings = editor.draft.video;
  // A preview does not start playing on its own: the editor is opened to look
  // at a clip, not to have it run.
  const video = useMediaPlayback(videoSettings, { autoPlay: false });
  const duration = item.duration || video.duration || 0;
  const trimEnd = videoSettings.trimEnd ?? duration;
  // The transport lives over the clip and steps out of the way once the pointer
  // settles, the way it does on the projected stage.
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

  // The transport owns whether the clip is running and where; the sidebar owns
  // how it sounds, so the volume and mute controls are heard as they are set.
  const previewPlayback = useMemo(
    () => ({
      ...video.playback,
      volume: videoSettings.volume,
      muted: video.playback.muted || videoSettings.muted,
    }),
    [video.playback, videoSettings.volume, videoSettings.muted],
  );

  // Nothing leaves the editor while a field is refusing what was typed into it.
  // The save control is already disabled by then; this says why for any other
  // route in, and keeps a half-typed trim off the audience display.
  //
  // Past that, a refused save (storage full) raises its own alert from the
  // store, so the editor stays dirty and says nothing rather than claiming it
  // wrote. Saving writes what the preview is already showing, so the clip is
  // left exactly where it is: an operator tuning a trim mid-review never has to
  // find their place again.
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

  /**
   * Brings the editor into line with what the room is already watching: the
   * sidebar takes the presented clip's settings, and the preview takes its
   * transport, down to the frame it is on. An operator who tuned a clip live and
   * then opened it here stops having two versions of it running against them.
   */
  const presentedVideo = editor.presentedVideo;
  const handleSyncFromPresentation = () => {
    if (!presentedVideo || !editor.adoptPresentation()) return;
    // The sidebar carries the mute and the level in this editor, and has just
    // taken the presentation's; the transport only has to match what the clip
    // is doing and where it has got to.
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
          fontFamily: UI,
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
        backTitle={BACK_TITLE[item.kind]}
        onBack={() => navigate(LIBRARY_PATH[item.kind])}
        onPresent={editor.present}
        actions={
          compact ? (
            <IconButton
              icon={Undo2}
              title="Reset all settings"
              onClick={editor.resetSettings}
            />
          ) : (
            <Button variant="ghost" size="sm" onClick={editor.resetSettings}>
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

      {stacked ? (
        <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          {preview}
          <div style={{ borderTop: `1px solid ${colors.border}` }}>
            {sidebar}
          </div>
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: "1fr 340px",
          }}
        >
          <div style={{ overflow: "hidden" }}>{preview}</div>
          <div
            style={{
              overflow: "auto",
              borderLeft: `1px solid ${colors.border}`,
            }}
          >
            {sidebar}
          </div>
        </div>
      )}

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
}

export const ImageEditorPage = () => <MediaEditorPage kind="image" />;
export const VideoEditorPage = () => <MediaEditorPage kind="video" />;
