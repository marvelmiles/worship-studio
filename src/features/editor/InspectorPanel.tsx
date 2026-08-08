import type { ReactNode } from "react";
import { ArrowDownToLine, Copy, Trash2 } from "lucide-react";
import type {
  AudioItem,
  Background,
  SlideDeckDoc,
  TextStyle,
  Theme,
} from "../../types";
import { fade, colors, UI } from "../../theme/tokens";
import {
  resolveBackgroundId,
  resolveLineStyle,
  resolveStyle,
} from "../../lib/resolve";
import { isInlineStyleKey } from "../../lib/inlineStyle";
import { Button } from "../../components/ui/Button";
import { inputStyle, SectionTitle, Toggle } from "../../components/ui/Field";
import { PillTabs } from "../../components/ui/PillTabs";
import { StyleControls } from "../../components/controls/StyleControls";
import { BackgroundPicker } from "../../components/controls/BackgroundPicker";
import { AudioPicker } from "../../components/controls/AudioPicker";
import { AnimationPicker } from "../../components/controls/AnimationPicker";
import { FormatToolbar } from "../../components/controls/FormatToolbar";
import type { TextFormattingController } from "../../hooks/useTextFormatting";
import type { DeckEditor } from "./useDeckEditor";

interface InspectorPanelProps {
  editor: DeckEditor;
  doc: SlideDeckDoc;
  theme: Theme;
  backgrounds: Background[];
  audio: AudioItem[];
  onAddColor: (value: string, name?: string) => string;
  /** The line styling is scoped to, or null while the whole slide is the scope. */
  selectedLine: number | null;
  onScopeToLine: (scoped: boolean) => void;
  formatting: TextFormattingController;
}

type StyleScope = "slide" | "line";

export function InspectorPanel({
  editor,
  doc,
  theme,
  backgrounds,
  audio,
  onAddColor,
  selectedLine,
  onScopeToLine,
  formatting,
}: InspectorPanelProps) {
  const { selectedSlide: slide, selectedIndex } = editor;
  const lineCount = slide.lines?.length ?? 0;
  const selectionMode = formatting.hasSelection;
  const lineMode =
    !selectionMode && selectedLine !== null && selectedLine < lineCount;
  const caretLine = Math.min(
    formatting.lines.first,
    Math.max(0, lineCount - 1),
  );

  // Highlighted text is styled character by character, so the panel shows the
  // style of the first line it covers with the selection's own style on top.
  const styleLine = selectionMode
    ? Math.min(formatting.lines.first, Math.max(0, lineCount - 1))
    : selectedLine;
  const style =
    styleLine !== null && styleLine < lineCount
      ? {
          ...resolveLineStyle(slide, styleLine, doc, theme),
          ...formatting.style,
        }
      : resolveStyle(slide, doc, theme);

  const effectiveBackgroundId = resolveBackgroundId(slide, doc, theme);
  const effectiveBackground = backgrounds.find(
    (bg) => bg.id === effectiveBackgroundId,
  );
  const hasLineOverrides =
    lineMode && Boolean(slide.lineOverrides?.[selectedLine]);

  /**
   * Where a text style lands, following what a word processor does: with text
   * highlighted, character properties go on that run and paragraph properties
   * (alignment, line height) go on every line it touches. Otherwise it is the
   * clicked line, or the whole slide.
   */
  const setTextOverride = (key: keyof TextStyle, value: unknown) => {
    if (selectionMode) {
      if (isInlineStyleKey(key)) {
        formatting.applyStyle(key, value);
        return;
      }
      const { first, last } = formatting.lines;
      const target: number[] = [];
      for (let line = first; line <= last && line < lineCount; line += 1)
        target.push(line);
      editor.updateLineOverrides(slide.id, target, key, value);
      return;
    }
    if (lineMode) {
      editor.updateLineOverride(slide.id, selectedLine, key, value);
      return;
    }
    editor.updateSlideOverride(slide.id, key, value);
  };
  const setOverride = (key: string, value: unknown) =>
    editor.updateSlideOverride(slide.id, key, value);

  const selectionLabel =
    formatting.lines.first === formatting.lines.last
      ? `Line ${formatting.lines.first + 1}`
      : `Lines ${formatting.lines.first + 1}–${formatting.lines.last + 1}`;

  return (
    <div style={{ padding: 18 }}>
      <SectionTitle>
        {selectionMode
          ? "Selected Text"
          : lineMode
            ? `Line ${selectedLine + 1} Text`
            : "Text"}
      </SectionTitle>
      {selectionMode && (
        <ScopeBanner>
          Styling the highlighted text. Alignment and line height apply to{" "}
          {selectionLabel.toLowerCase()}.
        </ScopeBanner>
      )}
      {!selectionMode && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <PillTabs<StyleScope>
            tabs={[
              { id: "slide", label: "Whole slide" },
              { id: "line", label: `Line ${caretLine + 1}` },
            ]}
            value={lineMode ? "line" : "slide"}
            onChange={(scope) => onScopeToLine(scope === "line")}
          />
          {lineMode && hasLineOverrides && (
            <button
              onClick={() => editor.clearLineOverrides(slide.id, selectedLine)}
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
              Reset line
            </button>
          )}
        </div>
      )}
      <StyleControls
        style={style}
        onChange={(key, value) => setTextOverride(key, value)}
      />

      <SectionTitle>Formatting</SectionTitle>
      <FormatToolbar controller={formatting} block />
      <p
        style={{
          fontFamily: UI,
          fontSize: 11.5,
          color: colors.dim,
          margin: "8px 0 0",
          lineHeight: 1.55,
        }}
      >
        Write straight onto the slide. Highlight a word, phrase or whole line
        there, then apply emphasis, turn it into a bulleted, numbered, lettered
        or roman-numeral list, or change its font, size and colour above.
        Ctrl+B, Ctrl+I and Ctrl+U work while typing, and Tab and Shift+Tab move
        a point in and out.
      </p>

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
          <ArrowDownToLine size={13} />
          Merge
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

function ScopeBanner({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        marginBottom: 10,
        padding: "7px 9px",
        borderRadius: 9,
        background: fade(colors.accent, 0.1),
        border: `1px solid ${fade(colors.accent, 0.3)}`,
        fontFamily: UI,
        fontSize: 12,
        lineHeight: 1.5,
        color: colors.accentSoft,
      }}
    >
      {children}
    </div>
  );
}
