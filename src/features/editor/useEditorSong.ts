import { useState } from "react";
import type { Slide, Song, TextStyle } from "../../types";
import { useStore } from "../../store/useStore";
import { parseLyrics } from "../../lib/parser";
import { now, uid } from "../../lib/id";

const blankSlide = (): Slide => ({
  id: uid(),
  type: "verse",
  label: "New Slide",
  lines: ["New line"],
  overrides: {},
  notes: "",
});

export function useEditorSong(song: Song) {
  const upsertSong = useStore((state) => state.upsertSong);
  const [selectedId, setSelectedId] = useState<string | null>(song.slides?.[0]?.id ?? null);

  const slides = song.slides ?? [];
  const selectedIndex = slides.findIndex((slide) => slide.id === selectedId);
  const selectedSlide = slides[selectedIndex] ?? slides[0];

  const patchSong = (changes: Partial<Song>) =>
    upsertSong({ ...song, ...changes, updatedAt: now() });

  const setSlides = (next: Slide[]) => patchSong({ slides: next });

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

  const updateSongStyle = (key: keyof TextStyle, value: unknown) => {
    const style = { ...(song.style || {}) } as Record<string, unknown>;
    if (value === "" || value == null) delete style[key];
    else style[key] = value;
    patchSong({ style });
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
    const first: Slide = { ...slide, lines: slide.lines.slice(0, mid) };
    const second: Slide = {
      ...slide,
      id: uid(),
      lines: slide.lines.slice(mid),
      label: `${slide.label} (b)`,
    };
    const next = [...slides];
    next.splice(index, 1, first, second);
    setSlides(next);
  };

  const mergeSlideDown = (index: number) => {
    if (index >= slides.length - 1) return;
    const merged: Slide = {
      ...slides[index],
      lines: [...slides[index].lines, ...slides[index + 1].lines],
    };
    const next = [...slides];
    next.splice(index, 2, merged);
    setSlides(next);
    setSelectedId(merged.id);
  };

  const regenerateFromLyrics = (lyrics: string, maxLines: number) => {
    patchSong({ lyrics, slides: parseLyrics(lyrics, maxLines) });
    setSelectedId(null);
  };

  return {
    slides,
    selectedId,
    setSelectedId,
    selectedIndex,
    selectedSlide,
    patchSong,
    setSlides,
    updateSlide,
    updateSlideOverride,
    updateSongStyle,
    moveSlide,
    duplicateSlide,
    removeSlide,
    insertSlideAt,
    splitSlide,
    mergeSlideDown,
    regenerateFromLyrics,
  };
}
