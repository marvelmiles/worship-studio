import type { Background, ResolvedStyle, Slide } from "../../types";
import { colors, UI } from "../../theme/tokens";
import { SlideCanvas } from "../../components/SlideCanvas";
import { inputStyle } from "../../components/ui/Field";
import { FormatToolbar } from "../../components/controls/FormatToolbar";
import type { TextFormattingController } from "../../hooks/useTextFormatting";

interface PreviewPanelProps {
  slide: Slide;
  style: ResolvedStyle;
  lineStyles?: ResolvedStyle[];
  background: Background;
  /** The slide's lines as one editable block. */
  text: string;
  onChangeText: (text: string) => void;
  formatting: TextFormattingController;
  onChangeLabel: (label: string) => void;
  selectedLine: number | null;
  onSelectLine: (index: number | null) => void;
}

export function PreviewPanel({
  slide,
  style,
  lineStyles,
  background,
  text,
  onChangeText,
  formatting,
  onChangeLabel,
  selectedLine,
  onSelectLine,
}: PreviewPanelProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: 24,
        background:
          "radial-gradient(circle at 50% 0%,rgba(255,255,255,0.02),transparent 60%)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 820,
          margin: "auto",
          boxShadow: "0 30px 70px rgba(0,0,0,0.5)",
          borderRadius: 14,
        }}
      >
        <SlideCanvas
          slide={slide}
          bg={background}
          style={style}
          lineStyles={lineStyles}
          showLabel
          scrim={slide.overrides?.scrim}
          selectedLine={selectedLine}
          onLineClick={onSelectLine}
        />
      </div>
      <div style={{ maxWidth: 820, margin: "18px auto 0", width: "100%" }}>
        <span
          style={{
            fontFamily: UI,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            color: colors.dim,
          }}
        >
          Slide Text
        </span>
        <p
          style={{
            fontFamily: UI,
            fontSize: 11.5,
            color: colors.dim,
            margin: "4px 0 8px",
            lineHeight: 1.5,
          }}
        >
          Highlight words below and use the toolbar to format them. Click a line
          on the slide to restyle that whole line: font, size, color, alignment.
        </p>
        <FormatToolbar controller={formatting} block />
        <textarea
          ref={formatting.bind}
          value={text}
          onChange={(e) => onChangeText(e.target.value)}
          onSelect={formatting.syncSelection}
          onKeyUp={formatting.syncSelection}
          onClick={formatting.syncSelection}
          onKeyDown={formatting.handleKeyDown}
          style={{
            ...inputStyle,
            marginTop: 8,
            minHeight: 92,
            lineHeight: 1.7,
            resize: "vertical",
            fontSize: 15,
          }}
        />
        <input
          value={slide.label}
          onChange={(e) => onChangeLabel(e.target.value)}
          placeholder="Slide label"
          style={{ ...inputStyle, marginTop: 8, fontSize: 13 }}
        />
      </div>
    </div>
  );
}
