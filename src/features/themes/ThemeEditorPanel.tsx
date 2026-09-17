import { useMemo } from "react";
import { Check, RotateCcw, Trash2 } from "lucide-react";
import type { Background, Theme } from "../../types";
import { fade } from "../../theme/uiTheme";
import { useUITheme } from "../../theme/ThemeProvider";
import { useStore } from "../../store/useStore";
import { resolveStyle } from "../../lib/resolve";
import { Button } from "../../components/ui/Button";
import { InfoTip } from "../../components/ui/InfoTip";
import {
  Field,
  Range,
  SectionTitle,
  TextInput,
  Toggle,
} from "../../components/ui/Field";
import { KeepOnResetToggle } from "../../components/ui/KeepOnResetToggle";
import { AnimationPicker } from "../../components/controls/AnimationPicker";
import { AudioPicker } from "../../components/controls/AudioPicker";
import { BackgroundPicker } from "../../components/controls/BackgroundPicker";
import { StyleControls } from "../../components/controls/StyleControls";
import { SlideCanvas } from "../../components/SlideCanvas";
import { THEME_SAMPLE_SLIDE } from "./themeSample";
import type { ThemeDraftController } from "./useThemeDraft";

const DEFAULT_SLIDE_SECONDS = 15;

interface ThemeEditorPanelProps {
  controller: ThemeDraftController;
  onDelete: () => void;
}

export const ThemeEditorPanel = ({
  controller,
  onDelete,
}: ThemeEditorPanelProps) => {
  const { colors, fonts } = useUITheme();
  const backgrounds = useStore((s) => s.backgrounds);
  const audio = useStore((s) => s.audio);
  const addCustomBackground = useStore((s) => s.addCustomBackground);

  const backgroundById = useMemo(() => {
    const map: Record<string, Background> = {};
    for (const background of backgrounds) map[background.id] = background;
    return map;
  }, [backgrounds]);

  const { draft, saved, dirty, nameError, patch, save, discard } = controller;
  if (!draft) return null;

  const style = resolveStyle(undefined, undefined, draft);

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <Button
          variant="primary"
          size="sm"
          onClick={save}
          disabled={!dirty || Boolean(nameError)}
          title={nameError ?? "Save this theme"}
        >
          <Check size={14} />
          Save theme
        </Button>
        {dirty && (
          <>
            <Button variant="ghost" size="sm" onClick={discard}>
              <RotateCcw size={13} />
              Discard changes
            </Button>
            <span
              style={{
                fontFamily: fonts.ui,
                fontSize: 12,
                fontWeight: 600,
                color: colors.accentSoft,
                background: fade(colors.accent, 0.14),
                border: `1px solid ${fade(colors.accent, 0.3)}`,
                borderRadius: 999,
                padding: "4px 11px",
              }}
            >
              Unsaved changes
            </span>
          </>
        )}
      </div>

      <Field label="Theme name" error={nameError}>
        <TextInput
          value={draft.name}
          invalid={Boolean(nameError)}
          onChange={(event) => patch({ name: event.target.value })}
        />
      </Field>
      <div style={{ marginBottom: 14, borderRadius: 10, overflow: "hidden" }}>
        <SlideCanvas
          slide={THEME_SAMPLE_SLIDE}
          style={style}
          bg={backgroundById[draft.backgroundId]}
          radius={10}
        />
      </div>
      <StyleControls
        style={style}
        onChange={(key, value) => patch({ [key]: value } as Partial<Theme>)}
      />
      <BackgroundPicker
        backgrounds={backgrounds}
        value={draft.backgroundId}
        onSelect={(id) => patch({ backgroundId: id })}
        onUploaded={(id) => patch({ backgroundId: id })}
        onAddColor={(value, name) =>
          patch({ backgroundId: addCustomBackground(value, name) })
        }
      />
      <AnimationPicker
        value={draft.animation || ""}
        inheritLabel="App default"
        onSelect={(value) =>
          patch({ animation: (value || undefined) as Theme["animation"] })
        }
      />

      <SectionTitle>Playback</SectionTitle>
      <div style={{ marginBottom: 12 }}>
        <Toggle
          label="Auto-play slides"
          checked={Boolean(draft.autoPlay)}
          onChange={(checked) => patch({ autoPlay: checked })}
        />
      </div>
      <Field
        label={`Seconds per slide (${draft.slideDurationSeconds ?? DEFAULT_SLIDE_SECONDS}s)`}
      >
        <Range
          value={draft.slideDurationSeconds ?? DEFAULT_SLIDE_SECONDS}
          min={3}
          max={60}
          suffix="s"
          onChange={(event) =>
            patch({ slideDurationSeconds: Number(event.target.value) })
          }
        />
      </Field>
      <AudioPicker
        audio={audio}
        value={draft.defaultAudioId || ""}
        inheritLabel="None"
        onSelect={(id) => patch({ defaultAudioId: id || null })}
        onUploaded={(id) => patch({ defaultAudioId: id })}
      />

      {draft.builtIn ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontFamily: fonts.ui,
            fontSize: 12.5,
            color: colors.dim,
            margin: "8px 0 0",
          }}
        >
          Default theme
          <InfoTip title="Default theme">
            You can edit a default theme, but it can&apos;t be deleted.
          </InfoTip>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
            marginTop: 10,
          }}
        >
          <KeepOnResetToggle
            kind="theme"
            item={saved ?? draft}
            variant="button"
          />
          <Button variant="danger" size="sm" onClick={onDelete}>
            <Trash2 size={13} />
            Delete theme
          </Button>
        </div>
      )}
    </div>
  );
};
