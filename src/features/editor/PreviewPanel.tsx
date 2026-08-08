import type {
  Background,
  ImageSettings,
  ResolvedStyle,
  Slide,
} from "../../types";
import { colors, UI } from "../../theme/tokens";
import { SlideCanvas } from "../../components/SlideCanvas";
import { inputStyle } from "../../components/ui/Field";
import { SelectionFormatToolbar } from "../../components/controls/SelectionFormatToolbar";
import { useSlideTextEditor } from "../../hooks/useSlideTextEditor";
import type { TextFormattingController } from "../../hooks/useTextFormatting";

interface PreviewPanelProps {
  slide: Slide;
  style: ResolvedStyle;
  lineStyles?: ResolvedStyle[];
  background: Background;
  /** This slide's picture settings for `background`. */
  backgroundImage: ImageSettings | null;
  /** The slide's lines as one editable block. */
  text: string;
  formatting: TextFormattingController;
  onChangeLabel: (label: string) => void;
  /** Line the inspector is scoped to, outlined on the slide. */
  selectedLine: number | null;
}

export function PreviewPanel({
  slide,
  style,
  lineStyles,
  background,
  backgroundImage,
  text,
  formatting,
  onChangeLabel,
  selectedLine,
}: PreviewPanelProps) {
  const editing = useSlideTextEditor({ text, formatting });

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
          bgImage={backgroundImage}
          style={style}
          lineStyles={lineStyles}
          showLabel
          selectedLine={selectedLine}
          editing={editing}
        />
      </div>

      <SelectionFormatToolbar
        controller={formatting}
        rect={editing.selectionRect}
      />

      <div style={{ maxWidth: 820, margin: "18px auto 0", width: "100%" }}>
        <p
          style={{
            fontFamily: UI,
            fontSize: 11.5,
            color: colors.dim,
            margin: "0 0 8px",
            lineHeight: 1.5,
          }}
        >
          Type straight onto the slide. Highlight a word or phrase for the
          formatting toolbar, or restyle it from the inspector. Tab and
          Shift+Tab move a point in and out, Enter carries the list on.
        </p>
        <input
          value={slide.label}
          onChange={(e) => onChangeLabel(e.target.value)}
          placeholder="Slide label"
          style={{ ...inputStyle, fontSize: 13 }}
        />
      </div>
    </div>
  );
}
