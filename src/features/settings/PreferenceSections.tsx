import type { EasingKind, PresentationView, Prefs, Theme } from "../../types";
import { InfoTip } from "../../components/ui/InfoTip";
import {
  Field,
  Range,
  Select,
  SectionTitle,
  Toggle,
} from "../../components/ui/Field";
import { AnimationPicker } from "../../components/controls/AnimationPicker";

const VIEW_OPTIONS = [
  { value: "normal", label: "Normal (fit, letterboxed)" },
  { value: "cover", label: "Cover (fill, may crop)" },
  { value: "fill", label: "Fill (stretch to screen)" },
];

const EASING_OPTIONS = [
  { value: "ease", label: "Ease" },
  { value: "ease-in-out", label: "Ease in-out" },
  { value: "ease-out", label: "Ease out" },
  { value: "linear", label: "Linear" },
];

interface PreferenceSectionProps {
  prefs: Prefs;
  onChange: (changes: Partial<Prefs>) => void;
}

export const PresentationSection = ({
  prefs,
  onChange,
}: PreferenceSectionProps) => (
  <>
    <SectionTitle>Presentation</SectionTitle>
    <Field label="Default screen fit">
      <Select
        value={prefs.presentationView}
        options={VIEW_OPTIONS}
        onChange={(event) =>
          onChange({
            presentationView: event.target.value as PresentationView,
          })
        }
      />
    </Field>
    <div style={{ marginBottom: 14 }}>
      <Toggle
        label="Show presenter bar"
        checked={prefs.showPresenterBar}
        onChange={(checked) => onChange({ showPresenterBar: checked })}
      />
    </div>
    <div style={{ marginBottom: 10 }}>
      <Toggle
        label="Auto-hide controls on mouse leave"
        checked={prefs.autoHideControls}
        onChange={(checked) => onChange({ autoHideControls: checked })}
      />
    </div>
    <div style={{ marginBottom: 14 }}>
      <Toggle
        label="Auto-hide presenter bar on mouse leave"
        checked={prefs.autoHidePresenterBar}
        onChange={(checked) => onChange({ autoHidePresenterBar: checked })}
      />
    </div>
  </>
);

export const DefaultThemesSection = ({
  prefs,
  themes,
  onChange,
}: PreferenceSectionProps & { themes: Theme[] }) => {
  const themeOptions = themes.map((theme) => ({
    value: theme.id,
    label: theme.name,
  }));
  return (
    <>
      <SectionTitle
        info={
          <InfoTip title="Default themes">
            Applied to newly created manuscripts and to Bible passages presented
            or saved from the reader.
          </InfoTip>
        }
      >
        Default Themes
      </SectionTitle>
      <Field label="Manuscripts">
        <Select
          value={prefs.defaultManuscriptThemeId}
          options={themeOptions}
          onChange={(event) =>
            onChange({ defaultManuscriptThemeId: event.target.value })
          }
        />
      </Field>
      <Field label="Bible">
        <Select
          value={prefs.defaultScriptureThemeId}
          options={themeOptions}
          onChange={(event) =>
            onChange({ defaultScriptureThemeId: event.target.value })
          }
        />
      </Field>
    </>
  );
};

export const TransitionsSection = ({
  prefs,
  onChange,
}: PreferenceSectionProps) => (
  <>
    <SectionTitle>Transitions</SectionTitle>
    <AnimationPicker
      label="Default animation"
      value={prefs.transition}
      onSelect={(value) =>
        onChange({ transition: value as Prefs["transition"] })
      }
    />
    <Field label={`Duration (${prefs.transitionDuration}ms)`}>
      <Range
        value={prefs.transitionDuration}
        min={150}
        max={1500}
        step={50}
        suffix="ms"
        onChange={(event) =>
          onChange({ transitionDuration: Number(event.target.value) })
        }
      />
    </Field>
    <Field label="Easing">
      <Select
        value={prefs.easing}
        options={EASING_OPTIONS}
        onChange={(event) =>
          onChange({ easing: event.target.value as EasingKind })
        }
      />
    </Field>
  </>
);

export const AudioSection = ({ prefs, onChange }: PreferenceSectionProps) => (
  <>
    <SectionTitle>Audio</SectionTitle>
    <Field label={`Background audio volume (${prefs.backgroundVolume}%)`}>
      <Range
        value={prefs.backgroundVolume}
        min={0}
        max={100}
        suffix="%"
        onChange={(event) =>
          onChange({ backgroundVolume: Number(event.target.value) })
        }
      />
    </Field>
    <div style={{ marginBottom: 6 }}>
      <Toggle
        label="Loop background audio"
        checked={prefs.loopAudio}
        onChange={(checked) => onChange({ loopAudio: checked })}
      />
    </div>
  </>
);
