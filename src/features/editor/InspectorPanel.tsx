import { Copy, Trash2 } from "lucide-react";
import type { AudioItem, Background, Song, Theme } from "../../types";
import { C } from "../../theme/tokens";
import { resolveBackgroundId, resolveStyle } from "../../lib/resolve";
import { Btn } from "../../components/ui/Button";
import { inputStyle, SectionTitle, Toggle } from "../../components/ui/Field";
import { StyleControls } from "../../components/controls/StyleControls";
import { BackgroundPicker } from "../../components/controls/BackgroundPicker";
import { AudioPicker } from "../../components/controls/AudioPicker";
import { AnimationPicker } from "../../components/controls/AnimationPicker";
import type { useEditorSong } from "./useEditorSong";

interface InspectorPanelProps {
  editor: ReturnType<typeof useEditorSong>;
  song: Song;
  theme: Theme;
  backgrounds: Background[];
  audio: AudioItem[];
  onAddColor: (value: string, name?: string) => string;
}

export function InspectorPanel({
  editor,
  song,
  theme,
  backgrounds,
  audio,
  onAddColor,
}: InspectorPanelProps) {
  const { selectedSlide: slide, selectedIndex } = editor;
  const style = resolveStyle(slide, song, theme);
  const effectiveBackgroundId = resolveBackgroundId(slide, song, theme);
  const effectiveBackground = backgrounds.find((bg) => bg.id === effectiveBackgroundId);

  const setOverride = (key: string, value: unknown) =>
    editor.updateSlideOverride(slide.id, key, value);

  return (
    <div style={{ padding: 18 }}>
      <SectionTitle>Text</SectionTitle>
      <StyleControls style={style} onChange={(key, value) => setOverride(key, value)} />

      <SectionTitle>Background</SectionTitle>
      <BackgroundPicker
        backgrounds={backgrounds}
        value={slide.overrides?.backgroundId || ""}
        highlightId={effectiveBackgroundId}
        inheritLabel="Use song / theme"
        onSelect={(id) => setOverride("backgroundId", id)}
        onUploaded={(id) => setOverride("backgroundId", id)}
        onAddColor={(value, name) => setOverride("backgroundId", onAddColor(value, name))}
      />
      {effectiveBackground?.type === "image" && (
        <div style={{ marginBottom: 12 }}>
          <Toggle
            label="Darken overlay (legibility)"
            checked={slide.overrides?.scrim ?? true}
            onChange={(checked) => setOverride("scrim", checked)}
          />
        </div>
      )}

      <SectionTitle>Audio</SectionTitle>
      <AudioPicker
        audio={audio}
        value={slide.overrides?.audioId || ""}
        inheritLabel="Use song / theme audio"
        onSelect={(id) => setOverride("audioId", id)}
        onUploaded={(id) => setOverride("audioId", id)}
      />

      <SectionTitle>Animation</SectionTitle>
      <AnimationPicker
        value={slide.overrides?.animation || ""}
        inheritLabel="Use song / theme"
        onSelect={(value) => setOverride("animation", value)}
      />

      <SectionTitle>Presenter Notes</SectionTitle>
      <textarea
        value={slide.notes || ""}
        onChange={(e) => editor.updateSlide(slide.id, { notes: e.target.value })}
        placeholder="Notes for the presenter (cues, transitions…)"
        style={{ ...inputStyle, minHeight: 70, resize: "vertical", fontSize: 13 }}
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 14 }}>
        <Btn size="sm" variant="ghost" onClick={() => editor.duplicateSlide(selectedIndex)}>
          <Copy size={13} />
          Duplicate
        </Btn>
        <Btn size="sm" variant="ghost" onClick={() => editor.splitSlide(selectedIndex)}>
          Split
        </Btn>
        <Btn size="sm" variant="ghost" onClick={() => editor.mergeSlideDown(selectedIndex)}>
          Merge ↓
        </Btn>
        <Btn size="sm" variant="danger" onClick={() => editor.removeSlide(selectedIndex)}>
          <Trash2 size={13} />
          Delete
        </Btn>
      </div>
    </div>
  );
}
