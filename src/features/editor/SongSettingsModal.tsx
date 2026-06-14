import type {
  AudioItem,
  Background,
  Song,
  TextStyle,
  Theme,
} from "../../types";
import { C, CATEGORIES, UI } from "../../theme/tokens";
import {
  resolveAutoPlay,
  resolveSlideDuration,
  resolveStyle,
} from "../../lib/resolve";
import { Modal } from "../../components/ui/Modal";
import {
  Field,
  Range,
  Select,
  TextInput,
  Toggle,
  SectionTitle,
} from "../../components/ui/Field";
import { StyleControls } from "../../components/controls/StyleControls";
import { BackgroundPicker } from "../../components/controls/BackgroundPicker";
import { AudioPicker } from "../../components/controls/AudioPicker";
import { AnimationPicker } from "../../components/controls/AnimationPicker";

interface SongSettingsModalProps {
  open: boolean;
  onClose: () => void;
  song: Song;
  theme: Theme;
  themes: Theme[];
  backgrounds: Background[];
  audio: AudioItem[];
  onPatchSong: (changes: Partial<Song>) => void;
  onStyleChange: (key: keyof TextStyle, value: unknown) => void;
  onAddColor: (value: string, name?: string) => string;
}

const GRID = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
  gap: 12,
} as const;

export function SongSettingsModal({
  open,
  onClose,
  song,
  theme,
  themes,
  backgrounds,
  audio,
  onPatchSong,
  onStyleChange,
  onAddColor,
}: SongSettingsModalProps) {
  const songStyle = resolveStyle(undefined, song, theme);
  const duration = resolveSlideDuration(song, theme);
  const autoPlay = resolveAutoPlay(song, theme);
  const themeAudio = theme.defaultAudioId
    ? audio.find((a) => a.id === theme.defaultAudioId)
    : undefined;

  return (
    <Modal open={open} onClose={onClose} title="Song Settings" width={620}>
      <p
        style={{
          fontFamily: UI,
          fontSize: 13,
          color: C.sub,
          marginTop: 0,
          lineHeight: 1.6,
        }}
      >
        These settings apply to every slide in this song. Individual slides can
        still override them in the inspector.
      </p>

      <SectionTitle>Details</SectionTitle>
      <div style={GRID}>
        <Field label="Title">
          <TextInput
            value={song.title}
            onChange={(e) => onPatchSong({ title: e.target.value })}
          />
        </Field>
        <Field label="Artist">
          <TextInput
            value={song.artist || ""}
            onChange={(e) => onPatchSong({ artist: e.target.value })}
          />
        </Field>
        <Field label="Collection">
          <Select
            value={song.category || "Worship"}
            options={CATEGORIES}
            onChange={(e) => onPatchSong({ category: e.target.value })}
          />
        </Field>
        <Field label="Theme">
          <Select
            value={song.defaultThemeId}
            options={themes.map((t) => ({ value: t.id, label: t.name }))}
            onChange={(e) => onPatchSong({ defaultThemeId: e.target.value })}
          />
        </Field>
      </div>

      <SectionTitle>Text</SectionTitle>
      <StyleControls style={songStyle} onChange={onStyleChange} />

      <SectionTitle>Background</SectionTitle>
      <BackgroundPicker
        backgrounds={backgrounds}
        value={song.defaultBackgroundId || ""}
        highlightId={song.defaultBackgroundId || theme.backgroundId}
        inheritLabel={`Use theme (${theme.name})`}
        onSelect={(id) => onPatchSong({ defaultBackgroundId: id })}
        onUploaded={(id) => onPatchSong({ defaultBackgroundId: id })}
        onAddColor={(value, name) =>
          onPatchSong({ defaultBackgroundId: onAddColor(value, name) })
        }
      />

      <SectionTitle>Audio</SectionTitle>
      <AudioPicker
        audio={audio}
        value={song.defaultAudioId || ""}
        inheritLabel={
          themeAudio ? `Use theme audio (${themeAudio.name})` : "None"
        }
        onSelect={(id) => onPatchSong({ defaultAudioId: id || null })}
        onUploaded={(id) => onPatchSong({ defaultAudioId: id })}
      />

      <SectionTitle>Animation</SectionTitle>
      <AnimationPicker
        value={song.animation || ""}
        inheritLabel="Use theme / app default"
        onSelect={(value) =>
          onPatchSong({ animation: (value || undefined) as Song["animation"] })
        }
      />

      <SectionTitle>Keyboard Shortcuts</SectionTitle>
      <Field label="Shortcut mode">
        <Select
          value={song.shortcutMode || "first-slide-per-tag"}
          options={[
            { value: "first-slide-per-tag", label: "Tag first slide only (default)" },
            { value: "all-slides", label: "Every slide" },
          ]}
          onChange={(e) =>
            onPatchSong({ shortcutMode: e.target.value as Song["shortcutMode"] })
          }
        />
      </Field>
      <p style={{ fontFamily: UI, fontSize: 12, color: C.dim, margin: "-4px 0 0" }}>
        {song.shortcutMode === "all-slides"
          ? "Ctrl+number shortcuts are assigned to every slide in order (Ctrl+1 → slide 1, Ctrl+2 → slide 2…)."
          : "Ctrl+number shortcuts jump to the first slide of each section tag only."}
      </p>

      <SectionTitle>Playback</SectionTitle>
      <div style={{ marginBottom: 12 }}>
        <Toggle
          label="Auto-play slides while presenting"
          checked={autoPlay}
          onChange={(checked) => onPatchSong({ autoPlay: checked })}
        />
      </div>
      <Field label={`Seconds per slide (${duration}s)`}>
        <Range
          value={duration}
          min={3}
          max={60}
          suffix="s"
          onChange={(e) =>
            onPatchSong({ slideDurationSeconds: Number(e.target.value) })
          }
        />
      </Field>
      {!autoPlay && (
        <p style={{ fontFamily: UI, fontSize: 12, color: C.dim, margin: 0 }}>
          Auto-play is off — slides change only when you navigate, animating in
          with their chosen animation.
        </p>
      )}
    </Modal>
  );
}
