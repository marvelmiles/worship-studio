import { useCallback, useState } from "react";
import type { Slide } from "../../../types";
import { useTextFormatting } from "../../../hooks/useTextFormatting";
import type { TextChangeMeta } from "../../../hooks/useTextFormatting";
import { useUndoRedoShortcuts } from "../../../hooks/useUndoRedoShortcuts";
import type { DeckEditor } from "../useDeckEditor";

/**
 * The text the editor is writing into: the slide's own lines, or the text box
 * picked on it, together with the formatting toolbar bound to that text.
 */
export const useSlideTextSurface = (
  editor: DeckEditor,
  slide: Slide | undefined,
  pickedTextBoxId: string | null,
) => {
  const [isLineScoped, setIsLineScoped] = useState(false);
  const slideId = slide?.id ?? null;
  const textBoxes = slide?.textBoxes ?? [];
  const bodyLines = slide?.lines ?? [];
  const isBodyVisible =
    !textBoxes.length || bodyLines.some((line) => line.trim() !== "");

  const activeTextBoxId =
    pickedTextBoxId && textBoxes.some((box) => box.id === pickedTextBoxId)
      ? pickedTextBoxId
      : isBodyVisible
        ? null
        : (textBoxes[0]?.id ?? null);
  const activeTextBox =
    textBoxes.find((box) => box.id === activeTextBoxId) ?? null;
  const text = (activeTextBox?.lines ?? bodyLines).join("\n");

  const { setSlideText, setSlideTextBoxText } = editor;
  const onTextChange = useCallback(
    (nextText: string, meta: TextChangeMeta) => {
      if (!slideId) return;
      const group = meta.coalesceKey ?? (meta.typing ? "typing" : null);
      const options = {
        caret: meta.caret,
        coalesceKey: group
          ? `text:${slideId}:${activeTextBoxId ?? "body"}:${group}`
          : undefined,
      };
      if (activeTextBoxId) {
        setSlideTextBoxText(slideId, activeTextBoxId, nextText, options);
      } else setSlideText(slideId, nextText, options);
    },
    [slideId, activeTextBoxId, setSlideText, setSlideTextBoxText],
  );

  const formatting = useTextFormatting({
    value: text,
    onChange: onTextChange,
    history: editor.history,
  });

  useUndoRedoShortcuts({
    canUndo: editor.canUndo,
    canRedo: editor.canRedo,
    undo: formatting.undo,
    redo: formatting.redo,
  });

  const lineCount = activeTextBox?.lines.length ?? bodyLines.length;
  const selectedLine =
    isLineScoped && lineCount
      ? Math.min(formatting.lines.first, lineCount - 1)
      : null;

  return {
    text,
    formatting,
    activeTextBoxId,
    selectedLine,
    setLineScope: setIsLineScoped,
  };
};
