import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Plus, RotateCcw, Trash2 } from "lucide-react";
import type { Background, Slide, Theme } from "../../types";
import { useStore } from "../../store/useStore";
import { useViewport } from "../../hooks/useViewport";
import { colors, fade, UI } from "../../theme/tokens";
import { resolveStyle } from "../../lib/resolve";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import {
  Field,
  Range,
  TextInput,
  Toggle,
  SectionTitle,
} from "../../components/ui/Field";
import { StyleControls } from "../../components/controls/StyleControls";
import { BackgroundPicker } from "../../components/controls/BackgroundPicker";
import { AnimationPicker } from "../../components/controls/AnimationPicker";
import { AudioPicker } from "../../components/controls/AudioPicker";
import { SlideCanvas } from "../../components/SlideCanvas";

const SAMPLE: Slide = {
  id: "sample",
  type: "verse",
  label: "",
  lines: ["Amazing grace", "how sweet the sound"],
  overrides: {},
  notes: "",
};

export function ThemesModal() {
  const overlay = useStore((s) => s.overlay);
  const overlayContext = useStore((s) => s.overlayContext);
  const close = useStore((s) => s.closeOverlay);
  const themes = useStore((s) => s.themes);
  const backgrounds = useStore((s) => s.backgrounds);
  const audio = useStore((s) => s.audio);
  const upsertTheme = useStore((s) => s.upsertTheme);
  const createTheme = useStore((s) => s.createTheme);
  const deleteTheme = useStore((s) => s.deleteTheme);
  const addCustomBackground = useStore((s) => s.addCustomBackground);
  const pushToast = useStore((s) => s.pushToast);
  const { width } = useViewport();
  const stacked = width < 760;

  const [selectedId, setSelectedId] = useState<string | null>(
    themes[0]?.id ?? null,
  );
  const savedTheme = themes.find((t) => t.id === selectedId) || themes[0];

  // Edits go into this draft; nothing is stored until the user clicks Save.
  const [draft, setDraft] = useState<Theme | null>(savedTheme ?? null);
  useEffect(() => {
    // Reset the draft when another theme is picked or the modal reopens.
    setDraft(themes.find((t) => t.id === selectedId) ?? themes[0] ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, overlay]);

  const hasUnsavedChanges = Boolean(
    draft && savedTheme && JSON.stringify(draft) !== JSON.stringify(savedTheme),
  );

  // Deep links (like dashboard activities) open the modal on a specific theme,
  // scrolled so that theme's card is visible.
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (overlay !== "themes" || !overlayContext) return;
    setSelectedId(overlayContext);
    requestAnimationFrame(() => {
      listRef.current
        ?.querySelector(`[data-theme-id="${overlayContext}"]`)
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }, [overlay, overlayContext]);

  const backgroundById = useMemo(() => {
    const map: Record<string, Background> = {};
    for (const background of backgrounds) map[background.id] = background;
    return map;
  }, [backgrounds]);

  const patchDraft = (changes: Partial<Theme>) =>
    setDraft((current) => (current ? { ...current, ...changes } : current));

  const saveDraft = () => {
    if (!draft) return;
    upsertTheme(draft);
    pushToast(`Theme "${draft.name}" saved.`);
  };

  const discardChanges = () => {
    if (savedTheme) setDraft(savedTheme);
  };

  const removeSelected = () => {
    if (!savedTheme || savedTheme.builtIn) return;
    deleteTheme(savedTheme.id);
    setSelectedId(themes.find((t) => t.id !== savedTheme.id)?.id ?? null);
  };

  return (
    <Modal
      open={overlay === "themes"}
      onClose={close}
      title="Themes"
      width={860}
    >
      <div
        style={{
          display: stacked ? "block" : "grid",
          gridTemplateColumns: "240px 1fr",
          gap: 18,
        }}
      >
        <div style={{ marginBottom: stacked ? 18 : 0 }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const created = createTheme();
              if (created) setSelectedId(created.id);
            }}
            style={{ width: "100%" }}
          >
            <Plus size={14} />
            New Theme
          </Button>
          <div
            ref={listRef}
            style={{
              marginTop: 10,
              display: stacked ? "grid" : "flex",
              gridTemplateColumns: "1fr 1fr",
              flexDirection: "column",
              gap: 8,
              maxHeight: stacked ? "none" : 360,
              overflow: "auto",
            }}
          >
            {themes.map((theme) => (
              <ThemeCard
                key={theme.id}
                theme={theme}
                background={backgroundById[theme.backgroundId]}
                active={theme.id === savedTheme?.id}
                onSelect={() => setSelectedId(theme.id)}
              />
            ))}
          </div>
        </div>

        {draft && (
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
              <Button variant="primary" size="sm" onClick={saveDraft} disabled={!hasUnsavedChanges}>
                <Check size={14} />
                Save theme
              </Button>
              {hasUnsavedChanges && (
                <>
                  <Button variant="ghost" size="sm" onClick={discardChanges}>
                    <RotateCcw size={13} />
                    Discard changes
                  </Button>
                  <span
                    style={{
                      fontFamily: UI,
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

            <Field label="Theme name">
              <TextInput
                value={draft.name}
                onChange={(e) => patchDraft({ name: e.target.value })}
              />
            </Field>
            <div
              style={{ marginBottom: 14, borderRadius: 10, overflow: "hidden" }}
            >
              <SlideCanvas
                slide={SAMPLE}
                style={resolveStyle(undefined, undefined, draft)}
                bg={backgroundById[draft.backgroundId]}
                radius={10}
              />
            </div>
            <StyleControls
              style={resolveStyle(undefined, undefined, draft)}
              onChange={(key, value) =>
                patchDraft({ [key]: value } as Partial<Theme>)
              }
            />
            <BackgroundPicker
              backgrounds={backgrounds}
              value={draft.backgroundId}
              onSelect={(id) => patchDraft({ backgroundId: id })}
              onUploaded={(id) => patchDraft({ backgroundId: id })}
              onAddColor={(value, name) =>
                patchDraft({ backgroundId: addCustomBackground(value, name) })
              }
            />
            <AnimationPicker
              value={draft.animation || ""}
              inheritLabel="App default"
              onSelect={(value) =>
                patchDraft({ animation: (value || undefined) as Theme["animation"] })
              }
            />

            <SectionTitle>Playback</SectionTitle>
            <div style={{ marginBottom: 12 }}>
              <Toggle
                label="Auto-play slides"
                checked={Boolean(draft.autoPlay)}
                onChange={(checked) => patchDraft({ autoPlay: checked })}
              />
            </div>
            <Field
              label={`Seconds per slide (${draft.slideDurationSeconds ?? 15}s)`}
            >
              <Range
                value={draft.slideDurationSeconds ?? 15}
                min={3}
                max={60}
                suffix="s"
                onChange={(e) =>
                  patchDraft({ slideDurationSeconds: Number(e.target.value) })
                }
              />
            </Field>
            <AudioPicker
              audio={audio}
              value={draft.defaultAudioId || ""}
              inheritLabel="None"
              onSelect={(id) => patchDraft({ defaultAudioId: id || null })}
              onUploaded={(id) => patchDraft({ defaultAudioId: id })}
            />

            {draft.builtIn ? (
              <p
                style={{
                  fontFamily: UI,
                  fontSize: 12.5,
                  color: colors.dim,
                  margin: "8px 0 0",
                }}
              >
                This is a default theme. You can edit it, but it can't be
                deleted.
              </p>
            ) : (
              <Button
                variant="danger"
                size="sm"
                onClick={removeSelected}
                style={{ marginTop: 10 }}
              >
                <Trash2 size={13} />
                Delete theme
              </Button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

function ThemeCard({
  theme,
  background,
  active,
  onSelect,
}: {
  theme: Theme;
  background: Background;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      data-theme-id={theme.id}
      style={{
        display: "block",
        width: "100%",
        padding: 6,
        borderRadius: 11,
        cursor: "pointer",
        textAlign: "left",
        background: active ? fade(colors.accent, 0.12) : colors.raise,
        border: `1px solid ${active ? fade(colors.accent, 0.4) : colors.border}`,
      }}
    >
      <div style={{ borderRadius: 7, overflow: "hidden" }}>
        <SlideCanvas
          slide={SAMPLE}
          style={resolveStyle(undefined, undefined, theme)}
          bg={background}
          radius={7}
        />
      </div>
      <div
        style={{
          fontFamily: UI,
          fontSize: 12.5,
          fontWeight: 600,
          color: active ? colors.accentSoft : colors.text,
          padding: "7px 4px 3px",
        }}
      >
        {theme.name}
        {theme.builtIn && (
          <span style={{ color: colors.dim, fontWeight: 500 }}> · default</span>
        )}
      </div>
    </button>
  );
}
