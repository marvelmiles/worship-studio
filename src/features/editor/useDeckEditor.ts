import { useState } from "react";
import type { Slide, SlideDeckDoc, TextStyle } from "../../types";
import { now, uid } from "../../lib/id";

const blankSlide = (): Slide => ({
  id: uid(),
  type: "verse",
  label: "New Slide",
  lines: ["New line"],
  overrides: {},
  notes: "",
});

/**
 * Slide-deck editing operations shared by every deck-based editor (songs,
 * scripture passages…). `save` persists the patched document.
 */
export function useDeckEditor<T extends SlideDeckDoc>(doc: T, save: (doc: T) => void) {
  const [selectedId, setSelectedId] = useState<string | null>(doc.slides?.[0]?.id ?? null);

  const slides = doc.slides ?? [];
  const selectedIndex = slides.findIndex((slide) => slide.id === selectedId);
  const selectedSlide = slides[selectedIndex] ?? slides[0];

  const patchDoc = (changes: Partial<T>) => save({ ...doc, ...changes, updatedAt: now() });

  const setSlides = (next: Slide[]) => patchDoc({ slides: next } as Partial<T>);

  const updateSlide = (id: string, changes: Partial<Slide>) =>
    setSlides(slides.map((slide) => (slide.id === id ? { ...slide, ...changes } : slide)));

  const updateSlideOverride = (id: string, key: string, value: unknown) => {
    const slide = slides.find((item) => item.id === id);
    if (!slide) return;
    const overrides = { ...(slide.overrides || {}) } as Record<string, unknown>;
    if (value === "" || value == null) delete overrides[key];
    else overrides[key] = value;
    updateSlide(id, { overrides });
  };

  const updateLineOverride = (id: string, lineIndex: number, key: string, value: unknown) => {
    const slide = slides.find((item) => item.id === id);
    if (!slide) return;
    const lineOverrides = { ...(slide.lineOverrides || {}) } as Record<number, Record<string, unknown>>;
    const line = { ...(lineOverrides[lineIndex] || {}) };
    if (value === "" || value == null) delete line[key];
    else line[key] = value;
    if (Object.keys(line).length) lineOverrides[lineIndex] = line;
    else delete lineOverrides[lineIndex];
    updateSlide(id, { lineOverrides });
  };

  const clearLineOverrides = (id: string, lineIndex: number) => {
    const slide = slides.find((item) => item.id === id);
    if (!slide?.lineOverrides) return;
    const lineOverrides = { ...slide.lineOverrides };
    delete lineOverrides[lineIndex];
    updateSlide(id, { lineOverrides });
  };

  const updateDocStyle = (key: keyof TextStyle, value: unknown) => {
    const style = { ...(doc.style || {}) } as Record<string, unknown>;
    if (value === "" || value == null) delete style[key];
    else style[key] = value;
    patchDoc({ style } as unknown as Partial<T>);
  };

  const moveSlide = (index: number, direction: number) => {
    const target = index + direction;
    if (target < 0 || target >= slides.length) return;
    const next = [...slides];
    [next[index], next[target]] = [next[target], next[index]];
    setSlides(next);
  };

  const duplicateSlide = (index: number) => {
    const copy: Slide = { ...slides[index], id: uid(), label: `${slides[index].label} (copy)` };
    const next = [...slides];
    next.splice(index + 1, 0, copy);
    setSlides(next);
    setSelectedId(copy.id);
  };

  const removeSlide = (index: number) => {
    const next = slides.filter((_, i) => i !== index);
    setSlides(next);
    if (slides[index].id === selectedId) {
      setSelectedId(next[Math.max(0, index - 1)]?.id ?? null);
    }
  };

  const insertSlideAt = (index: number) => {
    const slide = blankSlide();
    const next = [...slides];
    next.splice(index, 0, slide);
    setSlides(next);
    setSelectedId(slide.id);
  };

  const splitSlide = (index: number) => {
    const slide = slides[index];
    if (!slide.lines || slide.lines.length < 2) return;
    const mid = Math.ceil(slide.lines.length / 2);
    const firstOverrides: Record<number, TextStyle> = {};
    const secondOverrides: Record<number, TextStyle> = {};
    Object.entries(slide.lineOverrides || {}).forEach(([k, v]) => {
      const i = Number(k);
      if (i < mid) firstOverrides[i] = v;
      else secondOverrides[i - mid] = v;
    });
    const first: Slide = {
      ...slide,
      lines: slide.lines.slice(0, mid),
      lineOverrides: Object.keys(firstOverrides).length ? firstOverrides : undefined,
    };
    const second: Slide = {
      ...slide,
      id: uid(),
      lines: slide.lines.slice(mid),
      label: `${slide.label} (b)`,
      lineOverrides: Object.keys(secondOverrides).length ? secondOverrides : undefined,
    };
    const next = [...slides];
    next.splice(index, 1, first, second);
    setSlides(next);
  };

  const mergeSlideDown = (index: number) => {
    if (index >= slides.length - 1) return;
    const a = slides[index];
    const b = slides[index + 1];
    const offset = a.lines.length;
    const lineOverrides: Record<number, TextStyle> = { ...(a.lineOverrides || {}) };
    Object.entries(b.lineOverrides || {}).forEach(([i, v]) => {
      lineOverrides[Number(i) + offset] = v;
    });
    const merged: Slide = {
      ...a,
      lines: [...a.lines, ...b.lines],
      lineOverrides: Object.keys(lineOverrides).length ? lineOverrides : undefined,
    };
    const next = [...slides];
    next.splice(index, 2, merged);
    setSlides(next);
    setSelectedId(merged.id);
  };

  const replaceSlides = (next: Slide[]) => {
    setSlides(next);
    setSelectedId(next[0]?.id ?? null);
  };

  return {
    slides,
    selectedId,
    setSelectedId,
    selectedIndex,
    selectedSlide,
    patchDoc,
    setSlides,
    replaceSlides,
    updateSlide,
    updateSlideOverride,
    updateLineOverride,
    clearLineOverrides,
    updateDocStyle,
    moveSlide,
    duplicateSlide,
    removeSlide,
    insertSlideAt,
    splitSlide,
    mergeSlideDown,
  };
}

export type DeckEditor = ReturnType<typeof useDeckEditor>;
