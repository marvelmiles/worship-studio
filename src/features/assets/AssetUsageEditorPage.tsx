import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Image as ImageIcon, Music, Undo2 } from "lucide-react";
import type {
  AudioItem,
  AudioSettings,
  Background,
  ImageSettings,
  MediaItem,
  VideoSettings,
} from "../../types";
import { fade } from "../../theme/uiTheme";
import { useUITheme } from "../../theme/ThemeProvider";
import { useStore } from "../../store/useStore";
import { useViewport } from "../../hooks/useViewport";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useDraftHistory } from "../../hooks/useDraftHistory";
import { useMediaPlayback } from "../../hooks/useMediaPlayback";
import { useSpacePlayPause } from "../../hooks/useSpacePlayPause";
import { useUndoRedoShortcuts } from "../../hooks/useUndoRedoShortcuts";
import { useValidation } from "../../hooks/useValidation";
import { useConfirmedAction } from "../../hooks/useConfirmedAction";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";
import { useBlobUrl } from "../../lib/blobUrls";
import { mediaSurfaceProps } from "../../lib/mediaKeys";
import { formatDuration } from "../../lib/media";
import { settingsGrouping } from "../../lib/settingsHistory";
import { Button, IconButton } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { InfoTip } from "../../components/ui/InfoTip";
import { MissingPage } from "../../components/ui/MissingPage";
import { EditorSplitLayout } from "../../components/layout/EditorSplitLayout";
import { EditorTopBar } from "../../components/layout/EditorTopBar";
import { AudioSettingsControls } from "../../components/media/AudioSettingsControls";
import { AudioSurface } from "../../components/media/AudioSurface";
import { ImageLayer } from "../../components/media/ImageLayer";
import { ImageSettingsControls } from "../../components/media/ImageSettingsControls";
import { VideoSettingsControls } from "../../components/media/VideoSettingsControls";
import { VideoSurface } from "../../components/media/VideoSurface";
import { VideoTransportBar } from "../../components/media/VideoTransportBar";
import { assetUsageNote } from "../../lib/assetUsage";
import type { AssetUsageEdit, AssetUsageKind } from "../../lib/assetUsage";
import { useAssetUsageEditor } from "./assetUsageEdit";
import type { AssetUsageEditorSession } from "./assetUsageEdit";
import routes from "../../routes";

const LEAVE_MESSAGE =
  "The changes made here have not been handed back yet. If you leave now they are lost.";

const ASSET_NOUN: Record<AssetUsageKind, string> = {
  image: "Picture",
  video: "Moving background",
  audio: "Sound",
};

const STACKED_WIDTH = 1080;
const COMPACT_WIDTH = 560;

/**
 * Tunes one picture, clip or sound for the single slide, manuscript or passage
 * it was opened from. The asset in the library is never written to, so the same
 * file can look and sound different wherever else it is used.
 */
export const AssetUsageEditorPage = () => {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const usage = useAssetUsageEditor();
  const background = useStore((s) =>
    s.backgrounds.find((item) => item.id === assetId),
  );
  const sound = useStore((s) => s.audio.find((item) => item.id === assetId));
  const clip = useStore((s) =>
    s.media.find((item) => item.id === background?.mediaId),
  );

  if (!usage)
    return (
      <MissingPage
        icon={ImageIcon}
        title="Nothing to edit here"
        message="Open a picture, clip or sound from the slide, manuscript or passage it is used on, and its settings open here."
        actionLabel="Back to dashboard"
        onAction={() => navigate(routes.dashboard())}
      />
    );

  const { edit } = usage;
  const missing = (kind: AssetUsageKind) => (
    <MissingPage
      icon={kind === "audio" ? Music : ImageIcon}
      title={`${ASSET_NOUN[kind]} not found`}
      message="It may have been removed from your library."
      actionLabel={`Back to ${edit.label}`}
      onAction={() => navigate(edit.returnTo)}
    />
  );

  if (edit.kind === "image")
    return background ? (
      <ImageUsageWorkspace
        key={background.id}
        background={background}
        usage={usage}
        settings={edit.settings}
        defaults={edit.defaults}
      />
    ) : (
      missing("image")
    );

  if (edit.kind === "video")
    return background && clip ? (
      <VideoUsageWorkspace
        key={clip.id}
        item={clip}
        name={background.name}
        usage={usage}
        settings={edit.settings}
        defaults={edit.defaults}
      />
    ) : (
      missing("video")
    );

  return sound ? (
    <AudioUsageWorkspace
      key={sound.id}
      item={sound}
      usage={usage}
      settings={edit.settings}
      defaults={edit.defaults}
    />
  ) : (
    missing("audio")
  );
};

interface UsageFrameProps {
  name: string;
  kind: AssetUsageKind;
  usage: AssetUsageEditorSession;
  /** What the apply button hands back to the page the edit came from. */
  draft: AssetUsageEdit["settings"];
  dirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  invalid?: boolean;
  invalidReason?: string | null;
  preview: ReactNode;
  controls: ReactNode;
}

/** The chrome every usage editor shares: the top bar, the panels and the guards. */
const UsageFrame = ({
  name,
  kind,
  usage,
  draft,
  dirty,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onReset,
  invalid,
  invalidReason,
  preview,
  controls,
}: UsageFrameProps) => {
  const { colors, fonts } = useUITheme();
  const { width } = useViewport();
  const pushToast = useStore((s) => s.pushToast);
  const { edit, cancel } = usage;
  const stacked = width < STACKED_WIDTH;
  const compact = width < COMPACT_WIDTH;
  const [handedOver, setHandedOver] = useState<
    AssetUsageEdit["settings"] | null
  >(null);

  useDocumentTitle(name);
  useUndoRedoShortcuts({ canUndo, canRedo, undo: onUndo, redo: onRedo });

  const resetAll = useConfirmedAction(onReset);
  /* Handing the settings back is the save, so the guard stands between the back
     arrow and unapplied work only, and stands down for the trip back. */
  const leaveGuard = useUnsavedChanges(dirty && !handedOver);

  useEffect(() => {
    if (handedOver) usage.apply(handedOver);
  }, [handedOver, usage]);

  const apply = () => {
    if (invalid) {
      pushToast(invalidReason ?? "Fix the highlighted fields.", "error");
      return;
    }
    setHandedOver(draft);
  };

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
        title={name}
        compact={compact}
        backTitle={`Back to ${edit.label}`}
        onBack={cancel}
        leading={
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 6px 4px 9px",
              borderRadius: 999,
              background: fade(colors.accent, 0.12),
              border: `1px solid ${fade(colors.accent, 0.3)}`,
              fontFamily: fonts.ui,
              fontSize: 11.5,
              fontWeight: 600,
              color: colors.accentSoft,
              whiteSpace: "nowrap",
            }}
          >
            Editing for {edit.label}
            <InfoTip title="Where changes go">
              {assetUsageNote(edit.label, kind)}
            </InfoTip>
          </span>
        }
        actions={
          compact ? (
            <IconButton
              icon={Undo2}
              title="Reset all settings"
              onClick={resetAll.request}
            />
          ) : (
            <Button variant="ghost" size="sm" onClick={resetAll.request}>
              <Undo2 size={14} />
              Reset all
            </Button>
          )
        }
        dirty={dirty}
        invalid={invalid}
        invalidReason={invalidReason}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={onUndo}
        onRedo={onRedo}
        onSave={apply}
        saveLabel={`Apply to ${edit.label}`}
        savedLabel="Applied"
      />

      <EditorSplitLayout
        stacked={stacked}
        preview={
          <div
            style={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: stacked ? 16 : 24,
              minHeight: 0,
            }}
          >
            {preview}
          </div>
        }
        sidebar={<div style={{ padding: 18 }}>{controls}</div>}
      />

      <ConfirmDialog
        open={resetAll.prompting}
        title="Reset all settings?"
        message={`Every adjustment goes back to the way this asset sits in your library. It only reaches ${edit.label} once you apply it.`}
        confirmLabel="Reset all"
        onConfirm={resetAll.confirm}
        onCancel={resetAll.cancel}
      />

      <ConfirmDialog
        open={leaveGuard.prompting}
        title="Unapplied changes"
        message={LEAVE_MESSAGE}
        confirmLabel="Leave without applying"
        onConfirm={leaveGuard.discard}
        onCancel={leaveGuard.cancel}
      />
    </div>
  );
};

const PreviewSurface = ({ children }: { children: ReactNode }) => {
  const { colors } = useUITheme();
  return (
    <div
      {...mediaSurfaceProps}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "16/9",
        borderRadius: 14,
        overflow: "hidden",
        border: `1px solid ${colors.border}`,
        background: "#000",
      }}
    >
      {children}
    </div>
  );
};

interface ImageUsageWorkspaceProps {
  background: Background;
  usage: AssetUsageEditorSession;
  settings: ImageSettings;
  defaults: ImageSettings;
}

const ImageUsageWorkspace = ({
  background,
  usage,
  settings,
  defaults,
}: ImageUsageWorkspaceProps) => {
  const history = useDraftHistory<ImageSettings>(settings);
  const { draft } = history;
  const blobUrl = useBlobUrl(background.blobId ?? null);

  const patch = (changes: Partial<ImageSettings>) =>
    history.apply({ ...draft, ...changes }, settingsGrouping(changes, "image"));

  return (
    <UsageFrame
      name={background.name}
      kind="image"
      usage={usage}
      dirty={history.dirty}
      canUndo={history.canUndo}
      canRedo={history.canRedo}
      onUndo={history.undo}
      onRedo={history.redo}
      draft={draft}
      onReset={() => history.apply(defaults)}
      preview={
        <PreviewSurface>
          <ImageLayer
            src={blobUrl ?? background.dataUrl ?? null}
            alt={background.name}
            settings={draft}
          />
        </PreviewSurface>
      }
      controls={
        <ImageSettingsControls settings={draft} onChange={patch} narrow />
      }
    />
  );
};

interface VideoUsageWorkspaceProps {
  item: MediaItem;
  name: string;
  usage: AssetUsageEditorSession;
  settings: VideoSettings;
  defaults: VideoSettings;
}

const VideoUsageWorkspace = ({
  item,
  name,
  usage,
  settings,
  defaults,
}: VideoUsageWorkspaceProps) => {
  const history = useDraftHistory<VideoSettings>(settings);
  const { draft } = history;
  const stagePresenting = useStore(
    (s) => Boolean(s.presentation) && s.presentationMode === "stage",
  );
  const validation = useValidation();
  const video = useMediaPlayback(draft, { autoPlay: false });
  const duration = item.duration || video.duration || 0;
  const trimEnd = draft.trimEnd ?? duration;

  useSpacePlayPause({
    enabled: !stagePresenting,
    toggle: video.togglePlaying,
  });

  const playback = useMemo(
    () => ({
      ...video.playback,
      volume: draft.volume,
      muted: video.playback.muted || draft.muted,
    }),
    [video.playback, draft.volume, draft.muted],
  );

  const patch = (changes: Partial<VideoSettings>) =>
    history.apply({ ...draft, ...changes }, settingsGrouping(changes, "video"));

  return (
    <UsageFrame
      name={name}
      kind="video"
      usage={usage}
      dirty={history.dirty}
      canUndo={history.canUndo}
      canRedo={history.canRedo}
      onUndo={history.undo}
      onRedo={history.redo}
      draft={draft}
      onReset={() => history.apply(defaults)}
      invalid={validation.invalid}
      invalidReason={validation.message}
      preview={
        <PreviewSurface>
          <VideoSurface
            ref={video.surfaceRef}
            item={item}
            settings={draft}
            playback={playback}
            onTimeUpdate={video.onTimeUpdate}
            onEnded={video.onEnded}
          />
          <VideoTransportBar
            playing={video.playback.playing}
            muted={playback.muted}
            volume={draft.volume}
            time={video.time}
            start={draft.trimStart}
            end={trimEnd}
            onTogglePlaying={video.togglePlaying}
            onRestart={video.restart}
            onToggleMuted={() => patch({ muted: !draft.muted })}
            onVolume={(volume) => patch({ volume })}
            onSeek={video.seekTo}
            style={{ position: "absolute", left: 12, right: 12, bottom: 12 }}
          />
        </PreviewSurface>
      }
      controls={
        <VideoSettingsControls
          settings={draft}
          onChange={patch}
          duration={duration}
          playhead={video.time}
          onIssueChange={validation.reportIssue}
          narrow
        />
      }
    />
  );
};

interface AudioUsageWorkspaceProps {
  item: AudioItem;
  usage: AssetUsageEditorSession;
  settings: AudioSettings;
  defaults: AudioSettings;
}

const AudioUsageWorkspace = ({
  item,
  usage,
  settings,
  defaults,
}: AudioUsageWorkspaceProps) => {
  const { colors, fonts } = useUITheme();
  const history = useDraftHistory<AudioSettings>(settings);
  const { draft } = history;
  const loopAudio = useStore((s) => s.prefs.loopAudio);
  const stagePresenting = useStore(
    (s) => Boolean(s.presentation) && s.presentationMode === "stage",
  );
  const validation = useValidation();
  const player = useMediaPlayback(draft, { autoPlay: false });
  const duration = item.duration || player.duration || 0;
  const trimEnd = draft.trimEnd ?? duration;

  useSpacePlayPause({
    enabled: !stagePresenting,
    toggle: player.togglePlaying,
  });

  const playback = useMemo(
    () => ({ ...player.playback, volume: draft.volume }),
    [player.playback, draft.volume],
  );

  const patch = (changes: Partial<AudioSettings>) =>
    history.apply({ ...draft, ...changes }, settingsGrouping(changes, "audio"));

  return (
    <UsageFrame
      name={item.name}
      kind="audio"
      usage={usage}
      dirty={history.dirty}
      canUndo={history.canUndo}
      canRedo={history.canRedo}
      onUndo={history.undo}
      onRedo={history.redo}
      draft={draft}
      onReset={() => history.apply(defaults)}
      invalid={validation.invalid}
      invalidReason={validation.message}
      preview={
        <div
          {...mediaSurfaceProps}
          style={{
            width: "100%",
            maxWidth: 640,
            margin: "0 auto",
            padding: 28,
            borderRadius: 18,
            border: `1px solid ${colors.border}`,
            background: colors.bg2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 18,
          }}
        >
          <div
            aria-hidden
            style={{
              width: 96,
              height: 96,
              borderRadius: 24,
              display: "grid",
              placeItems: "center",
              background: fade(colors.accent, 0.14),
              color: colors.accentSoft,
            }}
          >
            <Music size={40} />
          </div>
          {duration > 0 && (
            <div
              style={{
                fontFamily: fonts.ui,
                fontSize: 13,
                color: colors.sub,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              Plays {formatDuration(Math.max(0, trimEnd - draft.trimStart))} of{" "}
              {formatDuration(duration)}
            </div>
          )}
          <VideoTransportBar
            playing={player.playback.playing}
            muted={player.playback.muted}
            volume={draft.volume}
            time={player.time}
            start={draft.trimStart}
            end={trimEnd}
            mediaNoun="sound"
            onTogglePlaying={player.togglePlaying}
            onRestart={player.restart}
            onToggleMuted={player.toggleMuted}
            onVolume={(volume) => patch({ volume })}
            onSeek={player.seekTo}
            style={{ width: "100%" }}
          />
          <AudioSurface
            ref={player.surfaceRef}
            item={item}
            settings={draft}
            loop={loopAudio}
            playback={playback}
            onTimeUpdate={player.onTimeUpdate}
            onEnded={player.onEnded}
          />
        </div>
      }
      controls={
        <AudioSettingsControls
          settings={draft}
          onChange={patch}
          duration={duration || undefined}
          playhead={player.time}
          onIssueChange={validation.reportIssue}
        />
      }
    />
  );
};
