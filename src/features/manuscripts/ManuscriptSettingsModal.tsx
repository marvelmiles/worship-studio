import type {
  AudioItem,
  Background,
  HymnMusic,
  Manuscript,
  TextStyle,
  Theme,
} from "../../types";
import { COLLECTIONS, DEFAULT_COLLECTION } from "../../data/collections";
import {
  resolveAutoPlay,
  resolveBackgroundImage,
  resolveSlideDuration,
  resolveStyle,
} from "../../lib/resolve";
import { validateName } from "../../lib/validation";
import { Modal } from "../../components/ui/Modal";
import { InfoTip } from "../../components/ui/InfoTip";
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
import { useOpenAssetLibrary } from "../assets/assetLibraryNavigation";
import { useUITheme } from "../../theme/ThemeProvider";

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
}

const GRID = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
  gap: 12,
} as const;

const TuneDetails = ({ music }: { music: HymnMusic }) => {
  const { colors, fonts } = useUITheme();

  const rows: [string, string][] = [
    ["Tune", music.tune ?? ""],
    ["Composer", music.composer ?? ""],
    ["Meter", music.meter ?? ""],
    ["Key", music.key ?? ""],
    ["Tempo", music.tempo ? `${music.tempo} bpm` : ""],
  ].filter((row): row is [string, string] => Boolean(row[1]));

  if (!rows.length && !music.source) return null;

  return (
    <>
      <SectionTitle>Tune</SectionTitle>
      <dl style={{ ...GRID, margin: "0 0 13px" }}>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt
              style={{
                fontFamily: fonts.ui,
                fontSize: 11.5,
                fontWeight: 600,
                letterSpacing: 0.4,
                textTransform: "uppercase",
                color: colors.dim,
                marginBottom: 6,
              }}
            >
              {label}
            </dt>
            <dd
              style={{
                margin: 0,
                fontFamily: fonts.ui,
                fontSize: 13.5,
                color: colors.text,
              }}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
      {music.source && (
        <p
          style={{
            margin: "0 0 13px",
            fontFamily: fonts.ui,
            fontSize: 11.5,
            lineHeight: 1.5,
            color: colors.dim,
          }}
        >
          {music.source}
        </p>
      )}
    </>
  );
};

export const ManuscriptSettingsModal = ({
  open,
  onClose,
  manuscript,
  theme,
  themes,
  backgrounds,
  audio,
  onPatchManuscript,
  onStyleChange,
}: ManuscriptSettingsModalProps) => {
  const openAssetLibrary = useOpenAssetLibrary();
  const titleError = validateName(manuscript.title, "manuscript title");
  const manuscriptStyle = resolveStyle(undefined, manuscript, theme);
  const duration = resolveSlideDuration(manuscript, theme);
  const autoPlay = resolveAutoPlay(manuscript, theme);
  const themeAudio = theme.defaultAudioId
    ? audio.find((a) => a.id === theme.defaultAudioId)
    : undefined;
  const effectiveBackground = backgrounds.find(
    (bg) => bg.id === (manuscript.defaultBackgroundId || theme.backgroundId),
  );
  const backgroundImage = effectiveBackground
    ? resolveBackgroundImage(undefined, manuscript, effectiveBackground)
    : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Manuscript Settings"
      width={620}
      info={
        <InfoTip title="Manuscript settings">
          These settings apply to every slide in this manuscript. Individual
          slides can still override them in the inspector.
        </InfoTip>
      }
    >
      <SectionTitle>Details</SectionTitle>
      <div style={GRID}>
        <Field label="Title" error={titleError}>
          <TextInput
            value={manuscript.title}
            invalid={Boolean(titleError)}
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

      {manuscript.music && <TuneDetails music={manuscript.music} />}

      <SectionTitle>Text</SectionTitle>
      <StyleControls style={manuscriptStyle} onChange={onStyleChange} />

      <SectionTitle>Background</SectionTitle>
      <BackgroundPicker
        backgrounds={backgrounds}
        value={manuscript.defaultBackgroundId || ""}
        highlightId={manuscript.defaultBackgroundId || theme.backgroundId}
        inheritLabel={`Use theme (${theme.name})`}
        onSelect={(id, image) =>
          onPatchManuscript({
            defaultBackgroundId: id,
            defaultBackgroundImage: image,
          })
        }
        onManage={() => openAssetLibrary("backgrounds", { locked: true })}
        imageSettings={backgroundImage}
        onImageSettingsChange={(settings) =>
          onPatchManuscript({ defaultBackgroundImage: settings })
        }
        usageLabel="this manuscript"
      />

      <SectionTitle>Audio</SectionTitle>
      <AudioPicker
        audio={audio}
        value={manuscript.defaultAudioId || ""}
        inheritLabel={
          themeAudio ? `Use theme audio (${themeAudio.name})` : "None"
        }
        onSelect={(id) => onPatchManuscript({ defaultAudioId: id || null })}
        onManage={() => openAssetLibrary("audio", { locked: true })}
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
      <Field
        label="Shortcut mode"
        info={
          <InfoTip title="Shortcut mode">
            {manuscript.shortcutMode === "all-slides"
              ? "Ctrl+number shortcuts are assigned to every slide in order: Ctrl+1 for slide 1, Ctrl+2 for slide 2, and so on."
              : "Ctrl+number shortcuts jump to verses only: Ctrl+1 for Verse 1, Ctrl+2 for Verse 2, and so on. Other sections use fixed shortcuts: Ctrl+C Chorus, Ctrl+B Bridge, Ctrl+I Intro, Ctrl+O Outro, Ctrl+P Pre-Chorus, Ctrl+R Refrain, Ctrl+T Tag."}
          </InfoTip>
        }
      >
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

      <SectionTitle
        info={
          <InfoTip title="Playback">
            With auto-play on, slides advance on their own after the seconds
            below. With it off, slides change only when you navigate, animating
            in with their chosen animation.
          </InfoTip>
        }
      >
        Playback
      </SectionTitle>
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
    </Modal>
  );
};
