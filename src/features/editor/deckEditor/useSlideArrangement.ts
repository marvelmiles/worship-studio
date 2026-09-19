import { useCallback } from "react";
import type { Slide, SlideDeckDoc, TextStyle } from "../../../types";
import { uid } from "../../../lib/id";
import { textCarrierOf, withCarrierText } from "../../../lib/slideTextBox";
import type { SlideTextMetrics } from "../../../lib/slideLayout";
import {
  detachFlow,
  reflowSlides,
  type ReflowOptions,
} from "../../../lib/slideReflow";
import type { DeckDocument } from "./useDeckDocument";
import { blankSlide } from "./slideEditHelpers";

/** Ordering, splitting and merging the deck's slides, plus deck-wide styling. */
export const useSlideArrangement = <T extends SlideDeckDoc>(
  deck: DeckDocument<T>,
) => {
  const {
    currentDoc,
    currentSelectedId,
    currentSlides,
    patchDoc,
    setSlides,
    setSelectedId,
  } = deck;

  /** Puts the whole document back to a known state, such as a built-in's defaults. */
  const replaceDoc = useCallback(
    (next: Partial<T>) => {
      patchDoc(next);
      setSelectedId(next.slides?.[0]?.id ?? null);
    },
    [patchDoc, setSelectedId],
  );

  /**
   * Re-cuts the automatically built runs of slides for the size the text is at
   * now, so raising the size moves the overflow onto another slide instead of
   * filling the frame edge to edge.
   */
  const refitSlides = useCallback(
    (metrics: SlideTextMetrics, options?: ReflowOptions): boolean => {
      const slides = currentSlides();
      const next = reflowSlides(slides, metrics, options);
      if (next === slides) return false;
      setSlides(next);
      const selected = currentSelectedId();
      if (selected && !next.some((slide) => slide.id === selected))
        setSelectedId(next[0]?.id ?? null);
      return true;
    },
    [currentSelectedId, currentSlides, setSelectedId, setSlides],
  );

  const updateDocStyle = useCallback(
    (key: keyof TextStyle, value: unknown) => {
      const style = { ...(currentDoc().style || {}) } as Record<
        string,
        unknown
      >;
      if (value === "" || value == null) delete style[key];
      else style[key] = value;
      patchDoc({ style } as unknown as Partial<T>, {
        coalesceKey: `docStyle:${key}`,
      });
    },
    [currentDoc, patchDoc],
  );

  const moveSlide = useCallback(
    (index: number, direction: number) => {
      const slides = currentSlides();
      const target = index + direction;
      if (target < 0 || target >= slides.length) return;
      const next = [...slides];
      [next[index], next[target]] = [next[target], next[index]];
      setSlides(next);
    },
    [currentSlides, setSlides],
  );

  const duplicateSlide = useCallback(
    (index: number) => {
      const slides = currentSlides();
      if (!slides[index]) return;
      const copy: Slide = detachFlow({
        ...slides[index],
        id: uid(),
        label: `${slides[index].label} (copy)`,
      });
      const next = [...slides];
      next.splice(index + 1, 0, copy);
      setSlides(next);
      setSelectedId(copy.id);
    },
    [currentSlides, setSelectedId, setSlides],
  );

  const removeSlide = useCallback(
    (index: number) => {
      const slides = currentSlides();
      const removed = slides[index];
      if (!removed) return;
      const next = slides.filter((_, slideIndex) => slideIndex !== index);
      setSlides(next);
      if (removed.id === currentSelectedId()) {
        setSelectedId(next[Math.max(0, index - 1)]?.id ?? null);
      }
    },
    [currentSelectedId, currentSlides, setSelectedId, setSlides],
  );

  const insertSlideAt = useCallback(
    (index: number) => {
      const slide = detachFlow(blankSlide());
      const next = [...currentSlides()];
      next.splice(index, 0, slide);
      setSlides(next);
      setSelectedId(slide.id);
    },
    [currentSlides, setSelectedId, setSlides],
  );

  const splitSlide = useCallback(
    (index: number) => {
      const slides = currentSlides();
      const slide = slides[index];
      if (!slide) return;
      const carrier = textCarrierOf(slide);
      if (carrier.lines.length < 2) return;

      const middle = Math.ceil(carrier.lines.length / 2);
      const firstOverrides: Record<number, TextStyle> = {};
      const secondOverrides: Record<number, TextStyle> = {};
      for (const [key, style] of Object.entries(carrier.lineOverrides || {})) {
        const lineIndex = Number(key);
        if (lineIndex < middle) firstOverrides[lineIndex] = style;
        else secondOverrides[lineIndex - middle] = style;
      }

      const asSlide = (
        base: Slide,
        lines: string[],
        overrides: Record<number, TextStyle>,
      ) =>
        withCarrierText(
          base,
          carrier,
          lines,
          Object.keys(overrides).length ? overrides : undefined,
        );

      const next = [...slides];
      next.splice(
        index,
        1,
        asSlide(slide, carrier.lines.slice(0, middle), firstOverrides),
        asSlide(
          detachFlow({ ...slide, id: uid(), label: `${slide.label} (b)` }),
          carrier.lines.slice(middle),
          secondOverrides,
        ),
      );
      setSlides(next);
    },
    [currentSlides, setSlides],
  );

  const mergeSlideDown = useCallback(
    (index: number) => {
      const slides = currentSlides();
      if (index >= slides.length - 1) return;
      const slide = slides[index];
      const following = slides[index + 1];
      const carrier = textCarrierOf(slide);
      const incoming = textCarrierOf(following);
      const offset = carrier.lines.length;

      const lineOverrides: Record<number, TextStyle> = {
        ...(carrier.lineOverrides || {}),
      };
      for (const [key, style] of Object.entries(incoming.lineOverrides || {})) {
        lineOverrides[Number(key) + offset] = style;
      }

      const withPlacements: Slide = {
        ...slide,
        media: [...(slide.media ?? []), ...(following.media ?? [])],
        textBoxes: [
          ...(slide.textBoxes ?? []),
          ...(following.textBoxes ?? []).filter(
            (box) => box.id !== incoming.boxId,
          ),
        ],
      };
      const merged = withCarrierText(
        detachFlow(withPlacements),
        carrier,
        [...carrier.lines, ...incoming.lines],
        Object.keys(lineOverrides).length ? lineOverrides : undefined,
      );

      const next = [...slides];
      next.splice(index, 2, merged);
      setSlides(next);
      setSelectedId(merged.id);
    },
    [currentSlides, setSelectedId, setSlides],
  );

  const replaceSlides = useCallback(
    (next: Slide[]) => {
      setSlides(next);
      setSelectedId(next[0]?.id ?? null);
    },
    [setSelectedId, setSlides],
  );

  return {
    replaceDoc,
    refitSlides,
    updateDocStyle,
    moveSlide,
    duplicateSlide,
    removeSlide,
    insertSlideAt,
    splitSlide,
    mergeSlideDown,
    replaceSlides,
  };
};
