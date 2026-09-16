import { useCallback } from "react";
import type { SlideDeckDoc, SlideOverrides } from "../../../types";
import type { DeckDocument } from "./useDeckDocument";
import {
  dropLineOverride,
  trimLineOverrides,
  withLineStyleKey,
  withStyleKey,
  type EditOptions,
} from "./slideEditHelpers";

/** Text and per-line styling for a slide's own lines and for its text boxes. */
export const useSlideTextEdits = <T extends SlideDeckDoc>(
  deck: DeckDocument<T>,
) => {
  const { slideOf, updateSlide } = deck;

  const setSlideText = useCallback(
    (id: string, text: string, options?: EditOptions) => {
      const slide = slideOf(id);
      if (!slide) return;
      const lines = text.split("\n");
      updateSlide(
        id,
        {
          lines,
          lineOverrides: trimLineOverrides(slide.lineOverrides, lines.length),
        },
        options,
      );
    },
    [slideOf, updateSlide],
  );

  const updateSlideOverride = useCallback(
    (id: string, key: string, value: unknown) => {
      const slide = slideOf(id);
      if (!slide) return;
      updateSlide(
        id,
        { overrides: withStyleKey(slide.overrides, key, value) },
        { coalesceKey: `override:${id}:${key}` },
      );
    },
    [slideOf, updateSlide],
  );

  const patchSlideOverrides = useCallback(
    (id: string, changes: Partial<SlideOverrides>) => {
      const slide = slideOf(id);
      if (!slide) return;
      let overrides: SlideOverrides = slide.overrides || {};
      for (const [key, value] of Object.entries(changes)) {
        overrides = withStyleKey(overrides, key, value);
      }
      updateSlide(id, { overrides });
    },
    [slideOf, updateSlide],
  );

  const setLineStyles = useCallback(
    (
      id: string,
      boxId: string | null,
      lineIndexes: number[],
      key: string,
      value: unknown,
    ) => {
      const slide = slideOf(id);
      if (!slide) return;
      const options: EditOptions = {
        coalesceKey: `lineStyle:${id}:${boxId ?? "body"}:${lineIndexes.join(",")}:${key}`,
      };
      if (!boxId) {
        updateSlide(
          id,
          {
            lineOverrides: withLineStyleKey(
              slide.lineOverrides,
              lineIndexes,
              key,
              value,
            ),
          },
          options,
        );
        return;
      }
      updateSlide(
        id,
        {
          textBoxes: (slide.textBoxes ?? []).map((box) =>
            box.id === boxId
              ? {
                  ...box,
                  lineOverrides: withLineStyleKey(
                    box.lineOverrides,
                    lineIndexes,
                    key,
                    value,
                  ),
                }
              : box,
          ),
        },
        options,
      );
    },
    [slideOf, updateSlide],
  );

  const setTextStyle = useCallback(
    (id: string, boxId: string | null, key: string, value: unknown) => {
      if (!boxId) {
        updateSlideOverride(id, key, value);
        return;
      }
      const slide = slideOf(id);
      if (!slide) return;
      updateSlide(
        id,
        {
          textBoxes: (slide.textBoxes ?? []).map((box) =>
            box.id === boxId
              ? { ...box, style: withStyleKey(box.style, key, value) }
              : box,
          ),
        },
        { coalesceKey: `textStyle:${id}:${boxId}:${key}` },
      );
    },
    [slideOf, updateSlide, updateSlideOverride],
  );

  const clearLineStyles = useCallback(
    (id: string, boxId: string | null, lineIndex: number) => {
      const slide = slideOf(id);
      if (!slide) return;
      if (!boxId) {
        updateSlide(id, {
          lineOverrides: dropLineOverride(slide.lineOverrides, lineIndex),
        });
        return;
      }
      updateSlide(id, {
        textBoxes: (slide.textBoxes ?? []).map((box) =>
          box.id === boxId
            ? {
                ...box,
                lineOverrides: dropLineOverride(box.lineOverrides, lineIndex),
              }
            : box,
        ),
      });
    },
    [slideOf, updateSlide],
  );

  return {
    setSlideText,
    updateSlideOverride,
    patchSlideOverrides,
    setLineStyles,
    setTextStyle,
    clearLineStyles,
  };
};
