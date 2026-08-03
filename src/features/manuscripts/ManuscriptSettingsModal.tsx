import type {
  AudioItem,
  Background,
  Manuscript,
  TextStyle,
  Theme,
} from "../../types";
import { colors, UI } from "../../theme/tokens";
import { COLLECTIONS, DEFAULT_COLLECTION } from "../../data/collections";
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

interface ManuscriptSettingsModalProps {
  open: boolean;
  onClose: () => void;
  manuscript: Manuscript;
  theme: Theme;
  themes: Theme[];
  backgrounds: Background[];
  audio: AudioItem[];
  onPatchManuscript: (changes: Partial<Manuscript>) => void;
  onStyleChange: (key: keyof TextStyle, value: unknown) => void;
  onAddColor: (value: string, name?: string) => string;
}

const GRID = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
  gap: 12,
} as const;

export function ManuscriptSettingsModal({
  open,
  onClose,
  manuscript,
  theme,
  themes,
  backgrounds,
  audio,
  onPatchManuscript,
  onStyleChange,
  onAddColor,
}: ManuscriptSettingsModalProps) {
  const manuscriptStyle = resolveStyle(undefined, manuscript, theme);
  const duration = resolveSlideDuration(manuscript, theme);
  const autoPlay = resolveAutoPlay(manuscript, theme);
  const themeAudio = theme.defaultAudioId
    ? audio.find((a) => a.id === theme.defaultAudioId)
    : undefined;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Manuscript Settings"
      width={620}
    >
      <p
        style={{
          fontFamily: UI,
          fontSize: 13,
          color: colors.sub,
          marginTop: 0,
          lineHeight: 1.6,
        }}
      >
        These settings apply to every slide in this manuscript. Individual
        slides can still override them in the inspector.
      </p>

      <SectionTitle>Details</SectionTitle>
      <div style={GRID}>
        <Field label="Title">
          <TextInput
            value={manuscript.title}
            onChange={(e) => onPatchManuscript({ title: e.target.value })}
          />
        </Field>
        <Field label="Author">
          <TextInput
            value={manuscript.author || ""}
            onChange={(e) => onPatchManuscript({ author: e.target.value })}
          />
        </Field>
        <Field label="Collection">
          <Select
            value={manuscript.collection || DEFAULT_COLLECTION}
            options={[...COLLECTIONS]}
            onChange={(e) => onPatchManuscript({ collection: e.target.value })}
          />
        </Field>
        <Field label="Theme">
          <Select
            value={manuscript.defaultThemeId}
            options={themes.map((t) => ({ value: t.id, label: t.name }))}
            onChange={(e) =>
              onPatchManuscript({ defaultThemeId: e.target.value })
            }
          />
        </Field>
      </div>

      <SectionTitle>Text</SectionTitle>
      <StyleControls style={manuscriptStyle} onChange={onStyleChange} />

      <SectionTitle>Background</SectionTitle>
      <BackgroundPicker
        backgrounds={backgrounds}
        value={manuscript.defaultBackgroundId || ""}
        highlightId={manuscript.defaultBackgroundId || theme.backgroundId}
        inheritLabel={`Use theme (${theme.name})`}
        onSelect={(id) => onPatchManuscript({ defaultBackgroundId: id })}
        onUploaded={(id) => onPatchManuscript({ defaultBackgroundId: id })}
        onAddColor={(value, name) =>
          onPatchManuscript({ defaultBackgroundId: onAddColor(value, name) })
        }
      />

      <SectionTitle>Audio</SectionTitle>
      <AudioPicker
        audio={audio}
        value={manuscript.defaultAudioId || ""}
        inheritLabel={
          themeAudio ? `Use theme audio (${themeAudio.name})` : "None"
        }
        onSelect={(id) => onPatchManuscript({ defaultAudioId: id || null })}
        onUploaded={(id) => onPatchManuscript({ defaultAudioId: id })}
      />

      <SectionTitle>Animation</SectionTitle>
      <AnimationPicker
        value={manuscript.animation || ""}
        inheritLabel="Use theme / app default"
        onSelect={(value) =>
          onPatchManuscript({
            animation: (value || undefined) as Manuscript["animation"],
          })
        }
      />

      <SectionTitle>Keyboard Shortcuts</SectionTitle>
      <Field label="Shortcut mode">
        <Select
          value={manuscript.shortcutMode || "first-slide-per-tag"}
          options={[
            {
              value: "first-slide-per-tag",
              label: "Tag first slide only (default)",
            },
            { value: "all-slides", label: "Every slide" },
          ]}
          onChange={(e) =>
            onPatchManuscript({
              shortcutMode: e.target.value as Manuscript["shortcutMode"],
            })
          }
        />
      </Field>
      <p
        style={{
          fontFamily: UI,
          fontSize: 12,
          color: colors.dim,
          margin: "-4px 0 0",
        }}
      >
        {manuscript.shortcutMode === "all-slides"
          ? "Ctrl+number shortcuts are assigned to every slide in order (Ctrl+1 → slide 1, Ctrl+2 → slide 2…)."
          : "Ctrl+number shortcuts jump to verses only (Ctrl+1 → Verse 1, Ctrl+2 → Verse 2…). Other sections use fixed shortcuts: Ctrl+C Chorus, Ctrl+B Bridge, Ctrl+I Intro, Ctrl+O Outro, Ctrl+P Pre-Chorus, Ctrl+R Refrain, Ctrl+T Tag."}
      </p>

      <SectionTitle>Playback</SectionTitle>
      <div style={{ marginBottom: 12 }}>
        <Toggle
          label="Auto-play slides while presenting"
          checked={autoPlay}
          onChange={(checked) => onPatchManuscript({ autoPlay: checked })}
        />
      </div>
      <Field label={`Seconds per slide (${duration}s)`}>
        <Range
          value={duration}
          min={3}
          max={60}
          suffix="s"
          onChange={(e) =>
            onPatchManuscript({ slideDurationSeconds: Number(e.target.value) })
          }
        />
      </Field>
      {!autoPlay && (
        <p
          style={{ fontFamily: UI, fontSize: 12, color: colors.dim, margin: 0 }}
        >
          Auto-play is off, so slides change only when you navigate, animating
          in with their chosen animation.
        </p>
      )}
    </Modal>
  );
}
