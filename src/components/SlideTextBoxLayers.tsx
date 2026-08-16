import type { CSSProperties, PointerEvent } from "react";
import type { ResolvedStyle, SlideTextBox } from "../types";
import {
  TEXT_BOX_PADDING,
  textBoxLineStyles,
  textBoxStyle,
} from "../lib/slideTextBox";
import type { SlideTextEditing } from "../hooks/useSlideTextEditor";
import { SlideTextBlock } from "./SlideTextBlock";

interface SlideTextBoxLayersProps {
  boxes: SlideTextBox[];
  /** The slide's resolved style, which every box inherits from. */
  style: ResolvedStyle;
  /** Attached to the box the editor is typing into; null when that is the slide body. */
  editing?: SlideTextEditing;
  editingBoxId?: string | null;
  /** Line the inspector is scoped to, outlined inside the box being written. */
  selectedLine?: number | null;
  /** True in the editor, where every box shows where it can be clicked into. */
  marked?: boolean;
  onPointerDownBox?: (
    boxId: string,
    event: PointerEvent<HTMLDivElement>,
  ) => void;
}

const frameStyle = (box: SlideTextBox): CSSProperties => ({
  position: "absolute",
  left: `${box.frame.x}%`,
  top: `${box.frame.y}%`,
  width: `${box.frame.width}%`,
  height: `${box.frame.height}%`,
});

/**
 * Paints the text boxes placed on a slide, over the pictures and clips so the
 * message is never buried by the artwork sitting behind it. The box the editor
 * is writing into becomes the editing surface; the rest are painted, not
 * editable, until they are clicked.
 */
export function SlideTextBoxLayers({
  boxes,
  style,
  editing,
  editingBoxId,
  selectedLine,
  marked,
  onPointerDownBox,
}: SlideTextBoxLayersProps) {
  return (
    <>
      {boxes.map((box) => {
        const active = Boolean(editing) && box.id === editingBoxId;
        return (
          <div key={box.id} style={frameStyle(box)}>
            <SlideTextBlock
              lines={box.lines}
              style={textBoxStyle(box, style)}
              lineStyles={textBoxLineStyles(box, style)}
              selectedLine={active ? selectedLine : null}
              editing={active ? editing : undefined}
              marked={marked}
              verticalAlign={box.verticalAlign}
              padding={TEXT_BOX_PADDING}
              onPointerDown={
                onPointerDownBox
                  ? (event) => onPointerDownBox(box.id, event)
                  : undefined
              }
            />
          </div>
        );
      })}
    </>
  );
}
