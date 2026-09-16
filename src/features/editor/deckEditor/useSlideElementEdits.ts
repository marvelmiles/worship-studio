import { useCallback } from "react";
import type {
  SlideDeckDoc,
  SlideElementKind,
  SlideFrame,
  SlideMedia,
  SlideTextBox,
} from "../../../types";
import { uid } from "../../../lib/id";
import { clampFrame } from "../../../lib/slideMedia";
import type { DeckDocument } from "./useDeckDocument";
import {
  DUPLICATE_OFFSET,
  listKeyFor,
  trimLineOverrides,
  type EditOptions,
  type PlacedElement,
} from "./slideEditHelpers";

/** The pictures, clips and text boxes placed on a slide. */
export const useSlideElementEdits = <T extends SlideDeckDoc>(
  deck: DeckDocument<T>,
) => {
  const { patchSlideList } = deck;

  const addSlideMedia = useCallback(
    (id: string, media: SlideMedia) =>
      void patchSlideList<SlideMedia>(id, "media", (list) => [...list, media]),
    [patchSlideList],
  );

  const updateSlideMedia = useCallback(
    (
      id: string,
      mediaId: string,
      changes: Partial<SlideMedia>,
      options?: EditOptions,
    ) =>
      void patchSlideList<SlideMedia>(
        id,
        "media",
        (list) =>
          list.map((item) =>
            item.id === mediaId ? { ...item, ...changes } : item,
          ),
        options,
      ),
    [patchSlideList],
  );

  const addSlideTextBox = useCallback(
    (id: string, box: SlideTextBox) =>
      void patchSlideList<SlideTextBox>(id, "textBoxes", (list) => [
        ...list,
        box,
      ]),
    [patchSlideList],
  );

  const updateSlideTextBox = useCallback(
    (
      id: string,
      boxId: string,
      changes: Partial<SlideTextBox>,
      options?: EditOptions,
    ) =>
      void patchSlideList<SlideTextBox>(
        id,
        "textBoxes",
        (list) =>
          list.map((box) => (box.id === boxId ? { ...box, ...changes } : box)),
        options,
      ),
    [patchSlideList],
  );

  const setSlideTextBoxText = useCallback(
    (id: string, boxId: string, text: string, options?: EditOptions) => {
      const lines = text.split("\n");
      patchSlideList<SlideTextBox>(
        id,
        "textBoxes",
        (list) =>
          list.map((box) =>
            box.id === boxId
              ? {
                  ...box,
                  lines,
                  lineOverrides: trimLineOverrides(
                    box.lineOverrides,
                    lines.length,
                  ),
                }
              : box,
          ),
        options,
      );
    },
    [patchSlideList],
  );

  const updateSlideElementFrame = useCallback(
    (
      id: string,
      kind: SlideElementKind,
      elementId: string,
      frame: SlideFrame,
      options?: EditOptions,
    ) =>
      void patchSlideList<PlacedElement>(
        id,
        listKeyFor(kind),
        (list) =>
          list.map((item) =>
            item.id === elementId ? { ...item, frame } : item,
          ),
        options,
      ),
    [patchSlideList],
  );

  const removeSlideElement = useCallback(
    (id: string, kind: SlideElementKind, elementId: string) =>
      void patchSlideList<PlacedElement>(id, listKeyFor(kind), (list) =>
        list.some((item) => item.id === elementId)
          ? list.filter((item) => item.id !== elementId)
          : null,
      ),
    [patchSlideList],
  );

  const duplicateSlideElement = useCallback(
    (id: string, kind: SlideElementKind, elementId: string): string | null => {
      const copyId = uid();
      const wasCopied = patchSlideList<PlacedElement>(
        id,
        listKeyFor(kind),
        (list) => {
          const source = list.find((item) => item.id === elementId);
          if (!source) return null;
          return [
            ...list,
            {
              ...source,
              id: copyId,
              frame: clampFrame({
                ...source.frame,
                x: source.frame.x + DUPLICATE_OFFSET,
                y: source.frame.y + DUPLICATE_OFFSET,
              }),
            },
          ];
        },
      );
      return wasCopied ? copyId : null;
    },
    [patchSlideList],
  );

  const reorderSlideElement = useCallback(
    (
      id: string,
      kind: SlideElementKind,
      elementId: string,
      direction: number,
    ) =>
      void patchSlideList<PlacedElement>(id, listKeyFor(kind), (list) => {
        const index = list.findIndex((item) => item.id === elementId);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= list.length) return null;
        const next = [...list];
        [next[index], next[target]] = [next[target], next[index]];
        return next;
      }),
    [patchSlideList],
  );

  return {
    addSlideMedia,
    updateSlideMedia,
    addSlideTextBox,
    updateSlideTextBox,
    setSlideTextBoxText,
    updateSlideElementFrame,
    removeSlideElement,
    duplicateSlideElement,
    reorderSlideElement,
  };
};
