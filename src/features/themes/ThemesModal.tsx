import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Background, Slide, Theme } from "../../types";
import { useStore } from "../../store/useStore";
import { useViewport } from "../../hooks/useViewport";
import { C, UI } from "../../theme/tokens";
import { resolveStyle } from "../../lib/resolve";
import { Modal } from "../../components/ui/Modal";
import { Btn } from "../../components/ui/Button";
import { Field, Range, TextInput, Toggle, SectionTitle } from "../../components/ui/Field";
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
  const close = useStore((s) => s.closeOverlay);
  const themes = useStore((s) => s.themes);
  const backgrounds = useStore((s) => s.backgrounds);
  const audio = useStore((s) => s.audio);
  const upsertTheme = useStore((s) => s.upsertTheme);
  const createTheme = useStore((s) => s.createTheme);
  const deleteTheme = useStore((s) => s.deleteTheme);
  const addCustomBackground = useStore((s) => s.addCustomBackground);
  const { width } = useViewport();
  const stacked = width < 760;

  const [selectedId, setSelectedId] = useState<string | null>(themes[0]?.id ?? null);
  const selected = themes.find((t) => t.id === selectedId) || themes[0];

  const bgMap = useMemo(() => {
    const map: Record<string, Background> = {};
    for (const bg of backgrounds) map[bg.id] = bg;
    return map;
  }, [backgrounds]);

  const patch = (changes: Partial<Theme>) => upsertTheme({ ...selected, ...changes });

  const remove = () => {
    if (!selected || selected.builtIn) return;
    deleteTheme(selected.id);
    setSelectedId(themes.find((t) => t.id !== selected.id)?.id ?? null);
  };

  return (
    <Modal open={overlay === "themes"} onClose={close} title="Themes" width={860}>
      <div style={{ display: stacked ? "block" : "grid", gridTemplateColumns: "240px 1fr", gap: 18 }}>
        <div style={{ marginBottom: stacked ? 18 : 0 }}>
          <Btn variant="ghost" size="sm" onClick={() => { const t = createTheme(); if (t) setSelectedId(t.id); }} style={{ width: "100%" }}>
            <Plus size={14} />
            New Theme
          </Btn>
          <div
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
                background={bgMap[theme.backgroundId]}
                active={theme.id === selected?.id}
                onSelect={() => setSelectedId(theme.id)}
              />
            ))}
          </div>
        </div>

        {selected && (
          <div>
            <Field label="Theme name">
              <TextInput value={selected.name} onChange={(e) => patch({ name: e.target.value })} />
            </Field>
            <div style={{ marginBottom: 14, borderRadius: 10, overflow: "hidden" }}>
              <SlideCanvas
                slide={SAMPLE}
                style={resolveStyle(undefined, undefined, selected)}
                bg={bgMap[selected.backgroundId]}
                radius={10}
              />
            </div>
            <StyleControls
              style={resolveStyle(undefined, undefined, selected)}
              onChange={(key, value) => patch({ [key]: value } as Partial<Theme>)}
            />
            <BackgroundPicker
              backgrounds={backgrounds}
              value={selected.backgroundId}
              onSelect={(id) => patch({ backgroundId: id })}
              onUploaded={(id) => patch({ backgroundId: id })}
              onAddColor={(value, name) => patch({ backgroundId: addCustomBackground(value, name) })}
            />
            <AnimationPicker
              value={selected.animation || ""}
              inheritLabel="App default"
              onSelect={(value) => patch({ animation: (value || undefined) as Theme["animation"] })}
            />

            <SectionTitle>Playback</SectionTitle>
            <div style={{ marginBottom: 12 }}>
              <Toggle
                label="Auto-advance slides"
                checked={Boolean(selected.autoPlay)}
                onChange={(checked) => patch({ autoPlay: checked })}
              />
            </div>
            <Field label={`Seconds per slide (${selected.slideDurationSeconds ?? 15}s)`}>
              <Range
                value={selected.slideDurationSeconds ?? 15}
                min={3}
                max={60}
                suffix="s"
                onChange={(e) => patch({ slideDurationSeconds: Number(e.target.value) })}
              />
            </Field>
            <AudioPicker
              audio={audio}
              value={selected.defaultAudioId || ""}
              inheritLabel="None"
              onSelect={(id) => patch({ defaultAudioId: id || null })}
              onUploaded={(id) => patch({ defaultAudioId: id })}
            />

            {selected.builtIn ? (
              <p style={{ fontFamily: UI, fontSize: 12.5, color: C.dim, margin: "8px 0 0" }}>
                This is a default theme — you can edit it, but it can't be deleted.
              </p>
            ) : (
              <Btn variant="danger" size="sm" onClick={remove} style={{ marginTop: 10 }}>
                <Trash2 size={13} />
                Delete theme
              </Btn>
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
      style={{
        display: "block",
        width: "100%",
        padding: 6,
        borderRadius: 11,
        cursor: "pointer",
        textAlign: "left",
        background: active ? "rgba(216,162,74,0.12)" : C.raise,
        border: `1px solid ${active ? "rgba(216,162,74,0.4)" : C.border}`,
      }}
    >
      <div style={{ borderRadius: 7, overflow: "hidden" }}>
        <SlideCanvas slide={SAMPLE} style={resolveStyle(undefined, undefined, theme)} bg={background} radius={7} />
      </div>
      <div
        style={{
          fontFamily: UI,
          fontSize: 12.5,
          fontWeight: 600,
          color: active ? C.goldSoft : C.text,
          padding: "7px 4px 3px",
        }}
      >
        {theme.name}
        {theme.builtIn && <span style={{ color: C.dim, fontWeight: 500 }}> · default</span>}
      </div>
    </button>
  );
}
