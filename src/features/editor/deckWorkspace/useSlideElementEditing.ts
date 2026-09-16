import { useEffect, useState } from "react";
import { createSlideTextBox } from "../../../lib/slideTextBox";
import type { DeckEditor } from "../useDeckEditor";
import type {
  SlideElementEditing,
  SlideElementRef,
} from "../SlideElementOverlay";

/** Selecting, moving and duplicating the elements placed on the open slide. */
export const useSlideElementEditing = (
  editor: DeckEditor,
  slideId: string | null,
) => {
  const [selectedElement, setSelectedElement] =
    useState<SlideElementRef | null>(null);
  const [pickedTextBoxId, setPickedTextBoxId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedElement(null);
    setPickedTextBoxId(null);
  }, [slideId]);

  const selectElement = (element: SlideElementRef | null) => {
    setSelectedElement(element);
    if (!element || element.kind === "text") {
      setPickedTextBoxId(element?.id ?? null);
    }
  };

  const editing: SlideElementEditing = {
    selectedId: selectedElement?.id ?? null,
    onSelect: selectElement,
    onFrameChange: (element, frame, gesture) => {
      if (!slideId) return;
      editor.updateSlideElementFrame(slideId, element.kind, element.id, frame, {
        coalesceKey: `element:${slideId}:${element.id}:${gesture}`,
      });
    },
    onDuplicate: (element) => {
      if (!slideId) return;
      const copyId = editor.duplicateSlideElement(
        slideId,
        element.kind,
        element.id,
      );
      if (copyId) selectElement({ id: copyId, kind: element.kind });
    },
    onDelete: (element) => {
      if (!slideId) return;
      editor.removeSlideElement(slideId, element.kind, element.id);
      selectElement(null);
    },
    onReorder: (element, direction) => {
      if (!slideId) return;
      editor.reorderSlideElement(slideId, element.kind, element.id, direction);
    },
  };

  const addTextBox = () => {
    if (!slideId) return;
    const box = createSlideTextBox();
    editor.addSlideTextBox(slideId, box);
    selectElement({ id: box.id, kind: "text" });
  };

  return {
    selectedElement,
    pickedTextBoxId,
    editing,
    selectElement,
    addTextBox,
    activateTextBox: (boxId: string | null) =>
      selectElement(boxId ? { id: boxId, kind: "text" } : null),
  };
};
