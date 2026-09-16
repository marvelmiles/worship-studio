import { useState } from "react";
import type { ReactNode } from "react";
import { ArrowDownToLine, Copy, Trash2 } from "lucide-react";
import type {
  AudioItem,
  Background,
  ImageSettings,
  SlideDeckDoc,
  TextStyle,
  Theme,
} from "../../types";
import { fade } from "../../theme/uiTheme";
import { useUITheme } from "../../theme/ThemeProvider";
import {
  layerTextStyle,
  resolveBackgroundId,
  resolveBackgroundImage,
  resolveLineStyle,
  resolveStyle,
} from "../../lib/resolve";
import { isInlineStyleKey } from "../../lib/inlineStyle";
import {
  allowsAnySlideElement,
  slideElementsTitle,
} from "../../lib/slideElements";
import type { SlideElementCapabilities } from "../../lib/slideElements";
import { Button } from "../../components/ui/Button";
import { inputStyle, SectionTitle, Toggle } from "../../components/ui/Field";
import { PillTabs } from "../../components/ui/PillTabs";
import { InfoTip } from "../../components/ui/InfoTip";
import { StyleControls } from "../../components/controls/StyleControls";
import { BackgroundPicker } from "../../components/controls/BackgroundPicker";
import { AudioPicker } from "../../components/controls/AudioPicker";
import { AnimationPicker } from "../../components/controls/AnimationPicker";
import { FormatToolbar } from "../../components/controls/FormatToolbar";
import type { TextFormattingController } from "../../hooks/useTextFormatting";
import { SlideElementsPanel } from "./SlideElementsPanel";
import type { SlideElementRef } from "./SlideElementOverlay";
import type { DeckEditor } from "./useDeckEditor";
import { useOpenAssetLibrary } from "../assets/assetLibraryNavigation";

interface InspectorPanelProps {
  editor: DeckEditor;
  doc: SlideDeckDoc;
  theme: Theme;
  backgrounds: Background[];
  audio: AudioItem[];
  documentNoun: string;
  selectedLine: number | null;
  onScopeToLine: (scoped: boolean) => void;
  formatting: TextFormattingController;
  selectedElement: SlideElementRef | null;
  onSelectElement: (element: SlideElementRef | null) => void;
  activeTextBoxId: string | null;
  elements: SlideElementCapabilities;
  onAddTextBox: () => void;
}

type StyleScope = "slide" | "line";
type AudioScope = "slide" | "document";

export const InspectorPanel = ({
  editor,
  doc,
  theme,
  backgrounds,
  audio,
  documentNoun,
  selectedLine,
  onScopeToLine,
  formatting,
  selectedElement,
  onSelectElement,
  activeTextBoxId,
  elements,
  onAddTextBox,
}: InspectorPanelProps) => {
  const { colors, fonts } = useUITheme();
  const { selectedSlide: slide, selectedIndex } = editor;
  const openAssetLibrary = useOpenAssetLibrary();
  const [audioScope, setAudioScope] = useState<AudioScope>("document");
  const themeAudio = theme.defaultAudioId
    ? audio.find((item) => item.id === theme.defaultAudioId)
    : undefined;

  const textBox =
    (slide.textBoxes ?? []).find((box) => box.id === activeTextBoxId) ?? null;
  const lines = textBox ? textBox.lines : (slide.lines ?? []);
  const lineCount = lines.length;
  const selectionMode = formatting.hasSelection;
  const lineMode =
    !selectionMode && selectedLine !== null && selectedLine < lineCount;
  const caretLine = Math.min(
    formatting.lines.first,
    Math.max(0, lineCount - 1),
  );

  const slideStyle = resolveStyle(slide, doc, theme);
  const styleAtLine = (line: number) =>
    textBox
      ? layerTextStyle(slideStyle, textBox.style, textBox.lineOverrides?.[line])
      : resolveLineStyle(slide, line, doc, theme);

  const styleLine = selectionMode
    ? Math.min(formatting.lines.first, Math.max(0, lineCount - 1))
    : selectedLine;
  const style =
    styleLine !== null && styleLine < lineCount
      ? { ...styleAtLine(styleLine), ...formatting.style }
      : textBox
        ? layerTextStyle(slideStyle, textBox.style)
        : slideStyle;

  const effectiveBackgroundId = resolveBackgroundId(slide, doc, theme);
  const effectiveBackground = backgrounds.find(
    (bg) => bg.id === effectiveBackgroundId,
  );
  const backgroundImage = effectiveBackground
    ? resolveBackgroundImage(slide, doc, effectiveBackground)
    : null;
  const ownLineOverrides = textBox
    ? textBox.lineOverrides
    : slide.lineOverrides;
  const hasLineOverrides =
    lineMode && Boolean(ownLineOverrides?.[selectedLine]);

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
      editor.setLineStyles(slide.id, activeTextBoxId, target, key, value);
      return;
    }
    if (lineMode) {
      editor.setLineStyles(
        slide.id,
        activeTextBoxId,
        [selectedLine],
        key,
        value,
      );
      return;
    }
    editor.setTextStyle(slide.id, activeTextBoxId, key, value);
  };
  const setOverride = (key: string, value: unknown) =>
    editor.updateSlideOverride(slide.id, key, value);

  const setBackgroundImage = (settings: ImageSettings) =>
    editor.patchSlideOverrides(slide.id, { backgroundImage: settings });

  const showElements =
    allowsAnySlideElement(elements) ||
    Boolean(slide.media?.length || slide.textBoxes?.length);

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
            : textBox
              ? "Text Box"
              : "Text"}
      </SectionTitle>
      {selectionMode && (
        <ScopeBanner>
          Styling highlighted text
          <InfoTip title="Highlighted text" align="end">
            Character styles land on the highlighted words. Alignment and line
            height apply to {selectionLabel.toLowerCase()}.
          </InfoTip>
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
              { id: "slide", label: textBox ? "Whole box" : "Whole slide" },
              { id: "line", label: `Line ${caretLine + 1}` },
            ]}
            value={lineMode ? "line" : "slide"}
            onChange={(scope) => onScopeToLine(scope === "line")}
          />
          {lineMode && hasLineOverrides && (
            <button
              onClick={() =>
                editor.clearLineStyles(slide.id, activeTextBoxId, selectedLine)
              }
              title={
                textBox
                  ? "Reset this line to the box's style"
                  : "Reset this line to the slide's style"
              }
              style={{
                fontFamily: fonts.ui,
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

      <SectionTitle
        info={
          <InfoTip title="Formatting" variant="modal">
            <p style={{ marginTop: 0 }}>
              Write straight onto the slide. Highlight a word, phrase or whole
              line there, then apply emphasis, turn it into a bulleted,
              numbered, lettered or roman-numeral list, or change its font, size
              and colour above.
            </p>
            <p style={{ marginBottom: 0 }}>
              Ctrl+B, Ctrl+I and Ctrl+U work while typing, and Tab and Shift+Tab
              move a point in and out.
            </p>
          </InfoTip>
        }
      >
        Formatting
      </SectionTitle>
      <FormatToolbar controller={formatting} block />

      <SectionTitle>Background</SectionTitle>
      <BackgroundPicker
        backgrounds={backgrounds}
        value={slide.overrides?.backgroundId || ""}
        highlightId={effectiveBackgroundId}
        inheritLabel="Use document / theme"
        onSelect={(id, image) =>
          editor.patchSlideOverrides(slide.id, {
            backgroundId: id,
            backgroundImage: image,
          })
        }
        onManage={() => openAssetLibrary("backgrounds", { locked: true })}
        imageSettings={backgroundImage}
        onImageSettingsChange={setBackgroundImage}
        usageLabel="this slide"
      />
      {backgroundImage && (
        <div style={{ marginBottom: 12 }}>
          <Toggle
            label="Darken overlay (legibility)"
            checked={backgroundImage.scrim}
            onChange={(scrim) =>
              setBackgroundImage({ ...backgroundImage, scrim })
            }
          />
        </div>
      )}

      {showElements && (
        <>
          <SectionTitle>{slideElementsTitle(elements)}</SectionTitle>
          <SlideElementsPanel
            slide={slide}
            editor={editor}
            selected={selectedElement}
            onSelect={onSelectElement}
            capabilities={elements}
            onAddTextBox={onAddTextBox}
          />
        </>
      )}

      <SectionTitle>Audio</SectionTitle>
      <div style={{ marginBottom: 10 }}>
        <PillTabs<AudioScope>
          tabs={[
            { id: "slide", label: "This slide" },
            { id: "document", label: `Whole ${documentNoun}` },
          ]}
          value={audioScope}
          onChange={setAudioScope}
        />
      </div>
      {audioScope === "slide" ? (
        <AudioPicker
          key="slide"
          audio={audio}
          value={slide.overrides?.audioId || ""}
          inheritLabel={`Use ${documentNoun} audio`}
          onSelect={(id) => setOverride("audioId", id)}
          onManage={() => openAssetLibrary("audio", { locked: true })}
        />
      ) : (
        <AudioPicker
          key="document"
          audio={audio}
          value={doc.defaultAudioId || ""}
          inheritLabel={
            themeAudio ? `Use theme audio (${themeAudio.name})` : "None"
          }
          onSelect={(id) => editor.patchDoc({ defaultAudioId: id || null })}
          onManage={() => openAssetLibrary("audio", { locked: true })}
        />
      )}

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
          editor.updateSlide(
            slide.id,
            { notes: e.target.value },
            { coalesceKey: `notes:${slide.id}` },
          )
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
};

const ScopeBanner = ({ children }: { children: ReactNode }) => {
  const { colors, fonts } = useUITheme();
  return (
    <div
      style={{
        marginBottom: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 6,
        padding: "5px 6px 5px 9px",
        borderRadius: 9,
        background: fade(colors.accent, 0.1),
        border: `1px solid ${fade(colors.accent, 0.3)}`,
        fontFamily: fonts.ui,
        fontSize: 12,
        lineHeight: 1.5,
        color: colors.accentSoft,
      }}
    >
      {children}
    </div>
  );
};
