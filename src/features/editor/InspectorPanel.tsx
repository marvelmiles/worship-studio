import { Copy, Trash2, X } from "lucide-react";
import type { AudioItem, Background, SlideDeckDoc, Theme } from "../../types";
import { fade, colors, UI } from "../../theme/tokens";
import {
  resolveBackgroundId,
  resolveLineStyle,
  resolveStyle,
} from "../../lib/resolve";
import { Button } from "../../components/ui/Button";
import { inputStyle, SectionTitle, Toggle } from "../../components/ui/Field";
import { StyleControls } from "../../components/controls/StyleControls";
import { BackgroundPicker } from "../../components/controls/BackgroundPicker";
import { AudioPicker } from "../../components/controls/AudioPicker";
import { AnimationPicker } from "../../components/controls/AnimationPicker";
import type { DeckEditor } from "./useDeckEditor";

interface InspectorPanelProps {
  editor: DeckEditor;
  doc: SlideDeckDoc;
  theme: Theme;
  backgrounds: Background[];
  audio: AudioItem[];
  onAddColor: (value: string, name?: string) => string;
  selectedLine: number | null;
  onSelectLine: (index: number | null) => void;
}

export function InspectorPanel({
  editor,
  doc,
  theme,
  backgrounds,
  audio,
  onAddColor,
  selectedLine,
  onSelectLine,
}: InspectorPanelProps) {
  const { selectedSlide: slide, selectedIndex } = editor;
  const lineMode =
    selectedLine !== null && selectedLine < (slide.lines?.length ?? 0);
  const style = lineMode
    ? resolveLineStyle(slide, selectedLine, doc, theme)
    : resolveStyle(slide, doc, theme);
  const effectiveBackgroundId = resolveBackgroundId(slide, doc, theme);
  const effectiveBackground = backgrounds.find(
    (bg) => bg.id === effectiveBackgroundId,
  );
  const hasLineOverrides =
    lineMode && Boolean(slide.lineOverrides?.[selectedLine]);

  // Text style (font/size/color/align/etc.) targets the selected line when in
  // line mode; background/audio/animation/scrim are always slide-level.
  const setTextOverride = (key: string, value: unknown) =>
    lineMode
      ? editor.updateLineOverride(slide.id, selectedLine, key, value)
      : editor.updateSlideOverride(slide.id, key, value);
  const setOverride = (key: string, value: unknown) =>
    editor.updateSlideOverride(slide.id, key, value);

  return (
    <div style={{ padding: 18 }}>
      <SectionTitle>
        {lineMode ? `Line ${selectedLine + 1} Text` : "Text"}
      </SectionTitle>
      {lineMode && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: 10,
            padding: "7px 9px",
            borderRadius: 9,
            background: fade(colors.accent, 0.1),
            border: `1px solid ${fade(colors.accent, 0.3)}`,
          }}
        >
          <span
            style={{ fontFamily: UI, fontSize: 12, color: colors.accentSoft }}
          >
            Formatting this line only
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            {hasLineOverrides && (
              <button
                onClick={() =>
                  editor.clearLineOverrides(slide.id, selectedLine)
                }
                title="Reset this line to the slide's style"
                style={{
                  fontFamily: UI,
                  fontSize: 11.5,
                  color: colors.sub,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  textDecoration: "underline",
                  padding: 0,
                }}
              >
                Reset
              </button>
            )}
            <button
              onClick={() => onSelectLine(null)}
              title="Done. Back to slide style"
              style={{
                display: "grid",
                placeItems: "center",
                width: 20,
                height: 20,
                borderRadius: 6,
                color: colors.sub,
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
      <StyleControls
        style={style}
        onChange={(key, value) => setTextOverride(key, value)}
      />

      <SectionTitle>Background</SectionTitle>
      <BackgroundPicker
        backgrounds={backgrounds}
        value={slide.overrides?.backgroundId || ""}
        highlightId={effectiveBackgroundId}
        inheritLabel="Use document / theme"
        onSelect={(id) => setOverride("backgroundId", id)}
        onUploaded={(id) => setOverride("backgroundId", id)}
        onAddColor={(value, name) =>
          setOverride("backgroundId", onAddColor(value, name))
        }
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
        inheritLabel="Use document / theme audio"
        onSelect={(id) => setOverride("audioId", id)}
        onUploaded={(id) => setOverride("audioId", id)}
      />

      <SectionTitle>Animation</SectionTitle>
      <AnimationPicker
        value={slide.overrides?.animation || ""}
        inheritLabel="Use document / theme"
        onSelect={(value) => setOverride("animation", value)}
      />

      <SectionTitle>Presenter Notes</SectionTitle>
      <textarea
        value={slide.notes || ""}
        onChange={(e) =>
          editor.updateSlide(slide.id, { notes: e.target.value })
        }
        placeholder="Notes for the presenter (cues, transitions…)"
        style={{
          ...inputStyle,
          minHeight: 70,
          resize: "vertical",
          fontSize: 13,
        }}
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 14 }}>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => editor.duplicateSlide(selectedIndex)}
        >
          <Copy size={13} />
          Duplicate
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => editor.splitSlide(selectedIndex)}
        >
          Split
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => editor.mergeSlideDown(selectedIndex)}
        >
          Merge ↓
        </Button>
        <Button
          size="sm"
          variant="danger"
          onClick={() => editor.removeSlide(selectedIndex)}
        >
          <Trash2 size={13} />
          Delete
        </Button>
      </div>
    </div>
  );
}
