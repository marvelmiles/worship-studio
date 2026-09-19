import { useCallback, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Music, Undo2 } from "lucide-react";
import type { AudioItem, AudioSettings } from "../../types";
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
import {
  useUnsavedChanges,
  UNSAVED_CHANGES_MESSAGE,
} from "../../hooks/useUnsavedChanges";
import { mediaSurfaceProps } from "../../lib/mediaKeys";
import {
  audioSettingsOf,
  DEFAULT_AUDIO_SETTINGS,
  formatDuration,
} from "../../lib/media";
import { settingsGrouping } from "../../lib/settingsHistory";
import { formatBytes } from "../../lib/storageStats";
import { validateName } from "../../lib/validation";
import { Button, IconButton } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { MissingPage } from "../../components/ui/MissingPage";
import { EditorSplitLayout } from "../../components/layout/EditorSplitLayout";
import { EditorTopBar } from "../../components/layout/EditorTopBar";
import { AudioSurface } from "../../components/media/AudioSurface";
import { AudioSettingsControls } from "../../components/media/AudioSettingsControls";
import { VideoTransportBar } from "../../components/media/VideoTransportBar";
import { useEditorReturn } from "./assetLibraryNavigation";
import routes from "../../routes";

interface AudioDraft {
  name: string;
  settings: AudioSettings;
}

export const AudioEditorPage = () => {
  const { audioId } = useParams();
  const navigate = useNavigate();
  const item = useStore((s) =>
    s.audio.find((entry) => entry.id === audioId && !entry.builtIn),
  );
  const lastRef = useRef(item);
  if (item) lastRef.current = item;

  if (!lastRef.current)
    return (
      <MissingPage
        icon={Music}
        title="Sound not found"
        message="It may have been deleted, or it is one of the bundled sounds."
        actionLabel="Back to dashboard"
        onAction={() => navigate(routes.dashboard())}
      />
    );

  return <AudioWorkspace key={lastRef.current.id} item={lastRef.current} />;
};

const AudioWorkspace = ({ item }: { item: AudioItem }) => {
  const { colors, fonts } = useUITheme();
  const { width } = useViewport();
  const stacked = width < 1080;
  const compact = width < 560;
  const pushToast = useStore((s) => s.pushToast);
  const updateAudio = useStore((s) => s.updateAudio);
  const loopAudio = useStore((s) => s.prefs.loopAudio);
  const stagePresenting = useStore(
    (s) => Boolean(s.presentation) && s.presentationMode === "stage",
  );

  const history = useDraftHistory<AudioDraft>({
    name: item.name,
    settings: audioSettingsOf(item),
  });
  const { draft, patch, apply, markSaved } = history;
  const { settings } = draft;

  const leaveGuard = useUnsavedChanges(history.dirty);
  const editorReturn = useEditorReturn(
    routes.dashboard(),
    item.id,
    "Back to dashboard",
    "audio",
  );
  const validation = useValidation({
    name: validateName(draft.name, "sound name"),
  });
  useDocumentTitle(draft.name);

  const player = useMediaPlayback(settings, { autoPlay: false });
  const duration = item.duration || player.duration || 0;
  const trimEnd = settings.trimEnd ?? duration;

  const previewPlayback = useMemo(
    () => ({ ...player.playback, volume: settings.volume }),
    [player.playback, settings.volume],
  );

  useUndoRedoShortcuts({
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    undo: history.undo,
    redo: history.redo,
  });
  useSpacePlayPause({
    enabled: !stagePresenting,
    toggle: player.togglePlaying,
  });

  const setName = useCallback(
    (name: string) => patch({ name }, { coalesceKey: "name" }),
    [patch],
  );

  const patchSettings = useCallback(
    (changes: Partial<AudioSettings>) =>
      patch(
        { settings: { ...settings, ...changes } },
        settingsGrouping(changes, "settings"),
      ),
    [patch, settings],
  );

  const resetAll = useConfirmedAction(
    useCallback(
      () => apply({ ...draft, settings: { ...DEFAULT_AUDIO_SETTINGS } }),
      [apply, draft],
    ),
  );

  const handleSave = () => {
    if (validation.invalid) {
      pushToast(validation.message ?? "Fix the highlighted fields.", "error");
      return;
    }
    const trimStart = Math.max(0, settings.trimStart);
    const end =
      settings.trimEnd !== null && settings.trimEnd > trimStart
        ? settings.trimEnd
        : null;
    const written = updateAudio(item.id, {
      name: draft.name.trim(),
      settings: { ...settings, trimStart, trimEnd: end },
      duration: duration || undefined,
    });
    if (!written) return;
    markSaved();
    pushToast("Sound saved.");
  };

  const preview = (
    <div
      style={{
        height: "100%",
        display: "grid",
        placeItems: "center",
        padding: stacked ? 16 : 24,
      }}
    >
      <div
        {...mediaSurfaceProps}
        style={{
          width: "100%",
          maxWidth: 640,
          padding: compact ? 18 : 28,
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
            width: compact ? 72 : 96,
            height: compact ? 72 : 96,
            borderRadius: 24,
            display: "grid",
            placeItems: "center",
            background: fade(colors.accent, 0.14),
            color: colors.accentSoft,
          }}
        >
          <Music size={compact ? 30 : 40} />
        </div>
        {duration > 0 && (
          <div
            style={{
              fontFamily: fonts.ui,
              fontSize: 13,
              color: colors.dim,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            Plays {formatDuration(Math.max(0, trimEnd - settings.trimStart))} of{" "}
            {formatDuration(duration)}
          </div>
        )}
        <VideoTransportBar
          playing={player.playback.playing}
          muted={player.playback.muted}
          volume={settings.volume}
          time={player.time}
          start={settings.trimStart}
          end={trimEnd}
          compact={compact}
          mediaNoun="sound"
          onTogglePlaying={player.togglePlaying}
          onRestart={player.restart}
          onToggleMuted={player.toggleMuted}
          onVolume={(volume) => patchSettings({ volume })}
          onSeek={player.seekTo}
          style={{ width: "100%" }}
        />
        <AudioSurface
          ref={player.surfaceRef}
          item={item}
          settings={settings}
          loop={loopAudio}
          playback={previewPlayback}
          onTimeUpdate={player.onTimeUpdate}
          onEnded={player.onEnded}
        />
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
        {formatBytes(item.size || 0)}
        {duration ? ` · ${formatDuration(duration)}` : ""}
      </p>
      <AudioSettingsControls
        settings={settings}
        onChange={patchSettings}
        duration={duration || undefined}
        playhead={player.time}
        onIssueChange={validation.reportIssue}
      />
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
        title={draft.name}
        onTitle={setName}
        compact={compact}
        backTitle={editorReturn.backTitle}
        onBack={editorReturn.back}
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
        dirty={history.dirty}
        titleError={validation.messageFor("name")}
        invalid={validation.invalid}
        invalidReason={validation.message}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onUndo={history.undo}
        onRedo={history.redo}
        onSave={handleSave}
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
