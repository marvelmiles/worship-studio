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
  style: ResolvedStyle;
  editing?: SlideTextEditing;
  editingBoxId?: string | null;
  selectedLine?: number | null;
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

export const SlideTextBoxLayers = ({
  boxes,
  style,
  editing,
  editingBoxId,
  selectedLine,
  marked,
  onPointerDownBox,
}: SlideTextBoxLayersProps) => {
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
};
