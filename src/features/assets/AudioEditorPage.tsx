import { useCallback, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Music, Undo2 } from "lucide-react";
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
import { formatBytes } from "../../lib/storageStats";
import { validateName } from "../../lib/validation";
import { Button, IconButton } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { EditorTopBar } from "../../components/layout/EditorTopBar";
import { AudioSurface } from "../../components/media/AudioSurface";
import { AudioSettingsControls } from "../../components/media/AudioSettingsControls";
import { VideoTransportBar } from "../../components/media/VideoTransportBar";
import { useEditorReturn } from "./assetLibraryNavigation";

interface AudioDraft {
  name: string;
  settings: AudioSettings;
}

const CONTINUOUS_KEYS = new Set(["volume", "trimStart", "trimEnd"]);

/**
 * The editor a library sound opens into: a player in the middle and its trim
 * and level beside it, under the same header every other editor wears.
 */
export function AudioEditorPage() {
  const { audioId } = useParams();
  const navigate = useNavigate();
  const { colors, fonts } = useUITheme();
  const item = useStore((s) =>
    s.audio.find((entry) => entry.id === audioId && !entry.builtIn),
  );
  // Keeps the last known copy so a deletion from elsewhere unmounts cleanly
  // instead of crashing mid-edit.
  const lastRef = useRef(item);
  if (item) lastRef.current = item;

  if (!lastRef.current) {
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
          <h2 style={{ fontFamily: fonts.display, color: colors.text }}>
            Sound not found
          </h2>
          <p style={{ fontFamily: fonts.ui, color: colors.sub }}>
            It may have been deleted, or it is one of the bundled sounds.
          </p>
          <Button variant="primary" onClick={() => navigate("/")}>
            <ArrowLeft size={15} />
            Back to dashboard
          </Button>
        </div>
      </div>
    );
  }

  return <AudioWorkspace key={lastRef.current.id} item={lastRef.current} />;
}

function AudioWorkspace({ item }: { item: AudioItem }) {
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
  const editorReturn = useEditorReturn("/", item.id, "audio");
  const validation = useValidation({
    name: validateName(draft.name, "sound name"),
  });
  useDocumentTitle(`${draft.name} · WorshipStudio`);

  const player = useMediaPlayback(settings, { autoPlay: false });
  const duration = item.duration || player.duration || 0;
  const trimEnd = settings.trimEnd ?? duration;

  // The transport owns whether the sound is running and where; the sidebar owns
  // how loud it is, so the level is heard as it is set.
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
    (changes: Partial<AudioSettings>) => {
      const keys = Object.keys(changes);
      patch(
        { settings: { ...settings, ...changes } },
        keys.every((key) => CONTINUOUS_KEYS.has(key))
          ? { coalesceKey: `settings:${keys.join(",")}` }
          : undefined,
      );
    },
    [patch, settings],
  );

  const resetSettings = () =>
    apply({ ...draft, settings: { ...DEFAULT_AUDIO_SETTINGS } });

  const handleSave = () => {
    if (validation.invalid) {
      pushToast(validation.message ?? "Fix the highlighted fields.", "error");
      return;
    }
    // A window whose end lands before its start would play nothing at all, so
    // an unusable end is read as "to the end" rather than saved as written.
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
        backTitle={editorReturn.fromLibrary ? "Back to audio library" : "Back"}
        onBack={editorReturn.back}
        actions={
          compact ? (
            <IconButton
              icon={Undo2}
              title="Reset all settings"
              onClick={resetSettings}
            />
          ) : (
            <Button variant="ghost" size="sm" onClick={resetSettings}>
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
