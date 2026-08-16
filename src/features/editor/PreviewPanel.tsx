import { useEffect, useMemo, useRef } from "react";
import type {
  Background,
  ImageSettings,
  ResolvedStyle,
  Slide,
} from "../../types";
import { colors, UI } from "../../theme/tokens";
import { SlideCanvas } from "../../components/SlideCanvas";
import type { ClickPoint } from "../../components/SlideCanvas";
import { inputStyle } from "../../components/ui/Field";
import { SelectionFormatToolbar } from "../../components/controls/SelectionFormatToolbar";
import { useSlideTextEditor } from "../../hooks/useSlideTextEditor";
import type { TextFormattingController } from "../../hooks/useTextFormatting";
import { SlideElementOverlay } from "./SlideElementOverlay";
import type { SlideElement, SlideElementEditing } from "./SlideElementOverlay";

interface PreviewPanelProps {
  slide: Slide;
  style: ResolvedStyle;
  lineStyles?: ResolvedStyle[];
  background: Background;
  /** This slide's picture settings for `background`. */
  backgroundImage: ImageSettings | null;
  /** The block being written into, as one editable run of text. */
  text: string;
  formatting: TextFormattingController;
  onChangeLabel: (label: string) => void;
  /** Line the inspector is scoped to, outlined on the slide. */
  selectedLine: number | null;
  /** The text box holding the caret, or null for the slide's own text. */
  activeTextBoxId: string | null;
  onActivateTextBox: (boxId: string | null) => void;
  /** Selection and drag handling for everything placed on this slide. */
  elementEditing: SlideElementEditing;
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
  activeTextBoxId,
  onActivateTextBox,
  elementEditing,
}: PreviewPanelProps) {
  const editing = useSlideTextEditor({ text, formatting });
  const { focusAt } = editing;
  const pendingPoint = useRef<ClickPoint | null>(null);

  const elements = useMemo<SlideElement[]>(
    () => [
      ...(slide.media ?? []).map((placed) => ({
        id: placed.id,
        kind: placed.kind,
        frame: placed.frame,
      })),
      ...(slide.textBoxes ?? []).map((box) => ({
        id: box.id,
        kind: "text" as const,
        frame: box.frame,
      })),
    ],
    [slide.media, slide.textBoxes],
  );

  // A block only becomes editable once it is the surface being written into,
  // which is a render after the click. The caret is put back where the click
  // landed as soon as that render lands, so clicking into a box feels native.
  useEffect(() => {
    const point = pendingPoint.current;
    pendingPoint.current = null;
    if (point) focusAt(point);
  }, [activeTextBoxId, slide.id, focusAt]);

  const activateText = (boxId: string | null, point: ClickPoint) => {
    // A block already holding the caret had it placed by the browser; only a
    // block taking over needs the click point replaying into it.
    if (boxId !== activeTextBoxId) pendingPoint.current = point;
    onActivateTextBox(boxId);
  };

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
        onPointerDown={() => elementEditing.onSelect(null)}
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
          editingTextBoxId={activeTextBoxId}
          onActivateText={activateText}
          mediaControlsFor={elementEditing.selectedId}
          overlay={
            elements.length ? (
              <SlideElementOverlay elements={elements} {...elementEditing} />
            ) : null
          }
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
          Pictures, clips and text boxes added from the inspector drag anywhere
          on the slide, resize from their corners and nudge with the arrow keys;
          a text box and a selected clip are moved by their edges, so their
          middle stays free to write in and to play from.
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
