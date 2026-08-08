import { useCallback, useMemo, useRef, useState } from "react";
import type {
  Slide,
  SlideDeckDoc,
  SlideOverrides,
  TextStyle,
} from "../../types";
import { now, uid } from "../../lib/id";
import type { EditHistory } from "../../hooks/useTextFormatting";
import type { TextRange } from "../../lib/textRange";

const blankSlide = (): Slide => ({
  id: uid(),
  type: "verse",
  label: "New Slide",
  lines: ["New line"],
  overrides: {},
  notes: "",
});

/** Steps kept for one editing session, bounded so a long service stays cheap. */
const HISTORY_LIMIT = 200;
/** Keystrokes this close together undo as one step, the way Word groups them. */
const COALESCE_MS = 600;

/** Everything an undo has to put back, the caret included. */
interface HistoryEntry<T> {
  doc: T;
  selectedId: string | null;
  /** Caret in the slide's text, or null for a change that was not typing. */
  caret: TextRange | null;
}

export interface EditOptions {
  /** Caret before the edit, so undo returns to where the writer was. */
  caret?: TextRange | null;
  /** Consecutive edits sharing a key fold into a single undo step. */
  coalesceKey?: string;
}

/**
 * One editing session over a slide-deck document (a manuscript, a scripture
 * passage…).
 *
 * Edits are made against a draft rather than the library: nothing is written
 * back until `save` runs, so a mistake on a Sunday morning never reaches the
 * stored document or, while a service is running, the live output. The draft
 * carries its own undo stack covering every change, text and structure alike,
 * which is why undo still works after clicking away to another slide and back.
 */
export function useDeckEditor<T extends SlideDeckDoc>(
  source: T,
  commit: (doc: T) => boolean,
) {
  const [doc, setDoc] = useState<T>(source);
  const [saved, setSaved] = useState<T>(source);
  const [selectedId, setSelectedId] = useState<string | null>(
    source.slides?.[0]?.id ?? null,
  );
  const [past, setPast] = useState<HistoryEntry<T>[]>([]);
  const [future, setFuture] = useState<HistoryEntry<T>[]>([]);
  const coalesceRef = useRef<{ key: string; at: number } | null>(null);

  // Mirrored so every command below can stay referentially stable: the canvas
  // binds DOM listeners to them and would otherwise rebind on every keystroke.
  const latest = useRef({ doc, selectedId, past, future });
  latest.current = { doc, selectedId, past, future };

  const slides = doc.slides ?? [];
  const selectedIndex = slides.findIndex((slide) => slide.id === selectedId);
  const selectedSlide = slides[selectedIndex] ?? slides[0];

  const apply = useCallback((next: T, options?: EditOptions) => {
    const { doc: current, selectedId: currentId } = latest.current;
    const at = Date.now();
    const key = options?.coalesceKey;
    const merge = Boolean(
      key &&
      coalesceRef.current?.key === key &&
      at - coalesceRef.current.at < COALESCE_MS,
    );
    coalesceRef.current = key ? { key, at } : null;

    if (!merge) {
      setPast((entries) =>
        [
          ...entries,
          {
            doc: current,
            selectedId: currentId,
            caret: options?.caret ?? null,
          },
        ].slice(-HISTORY_LIMIT),
      );
      setFuture([]);
    }
    setDoc(next);
  }, []);

  const patchDoc = useCallback(
    (changes: Partial<T>, options?: EditOptions) =>
      apply({ ...latest.current.doc, ...changes, updatedAt: now() }, options),
    [apply],
  );

  const setSlides = useCallback(
    (next: Slide[], options?: EditOptions) =>
      patchDoc({ slides: next } as Partial<T>, options),
    [patchDoc],
  );

  const updateSlide = useCallback(
    (id: string, changes: Partial<Slide>, options?: EditOptions) =>
      setSlides(
        (latest.current.doc.slides ?? []).map((slide) =>
          slide.id === id ? { ...slide, ...changes } : slide,
        ),
        options,
      ),
    [setSlides],
  );

  /**
   * Writes the slide's lines back from the single block of text the canvas
   * edits. Overrides for lines that no longer exist go with them.
   */
  const setSlideText = useCallback(
    (id: string, text: string, options?: EditOptions) => {
      const slide = (latest.current.doc.slides ?? []).find(
        (item) => item.id === id,
      );
      if (!slide) return;
      const lines = text.split("\n");
      const lineOverrides = slide.lineOverrides
        ? Object.fromEntries(
            Object.entries(slide.lineOverrides).filter(
              ([index]) => Number(index) < lines.length,
            ),
          )
        : undefined;
      updateSlide(id, { lines, lineOverrides }, options);
    },
    [updateSlide],
  );

  const updateSlideOverride = useCallback(
    (id: string, key: string, value: unknown) => {
      const slide = (latest.current.doc.slides ?? []).find(
        (item) => item.id === id,
      );
      if (!slide) return;
      const overrides = { ...(slide.overrides || {}) } as Record<
        string,
        unknown
      >;
      if (value === "" || value == null) delete overrides[key];
      else overrides[key] = value;
      // Dragging a slider fires continuously; the whole drag is one undo step.
      updateSlide(id, { overrides }, { coalesceKey: `override:${id}:${key}` });
    },
    [updateSlide],
  );

  /**
   * Several override keys in one undo step. Choosing a background writes the
   * picture settings that come with it, and both belong to the same step.
   */
  const patchSlideOverrides = useCallback(
    (id: string, changes: Partial<SlideOverrides>) => {
      const slide = (latest.current.doc.slides ?? []).find(
        (item) => item.id === id,
      );
      if (!slide) return;
      const overrides = { ...(slide.overrides || {}) } as Record<
        string,
        unknown
      >;
      for (const [key, value] of Object.entries(changes)) {
        if (value === "" || value == null) delete overrides[key];
        else overrides[key] = value;
      }
      updateSlide(id, { overrides });
    },
    [updateSlide],
  );

  /** One patch for every line at once: a loop over the single-line form would
   *  read stale slides and only the last change would survive. */
  const updateLineOverrides = useCallback(
    (id: string, lineIndexes: number[], key: string, value: unknown) => {
      const slide = (latest.current.doc.slides ?? []).find(
        (item) => item.id === id,
      );
      if (!slide) return;
      const lineOverrides = { ...(slide.lineOverrides || {}) } as Record<
        number,
        Record<string, unknown>
      >;
      for (const lineIndex of lineIndexes) {
        const line = { ...(lineOverrides[lineIndex] || {}) };
        if (value === "" || value == null) delete line[key];
        else line[key] = value;
        if (Object.keys(line).length) lineOverrides[lineIndex] = line;
        else delete lineOverrides[lineIndex];
      }
      updateSlide(
        id,
        { lineOverrides },
        { coalesceKey: `lineOverride:${id}:${lineIndexes.join(",")}:${key}` },
      );
    },
    [updateSlide],
  );

  const updateLineOverride = useCallback(
    (id: string, lineIndex: number, key: string, value: unknown) =>
      updateLineOverrides(id, [lineIndex], key, value),
    [updateLineOverrides],
  );

  const clearLineOverrides = useCallback(
    (id: string, lineIndex: number) => {
      const slide = (latest.current.doc.slides ?? []).find(
        (item) => item.id === id,
      );
      if (!slide?.lineOverrides) return;
      const lineOverrides = { ...slide.lineOverrides };
      delete lineOverrides[lineIndex];
      updateSlide(id, { lineOverrides });
    },
    [updateSlide],
  );

  const updateDocStyle = useCallback(
    (key: keyof TextStyle, value: unknown) => {
      const style = { ...(latest.current.doc.style || {}) } as Record<
        string,
        unknown
      >;
      if (value === "" || value == null) delete style[key];
      else style[key] = value;
      patchDoc({ style } as unknown as Partial<T>, {
        coalesceKey: `docStyle:${key}`,
      });
    },
    [patchDoc],
  );

  const moveSlide = useCallback(
    (index: number, direction: number) => {
      const current = latest.current.doc.slides ?? [];
      const target = index + direction;
      if (target < 0 || target >= current.length) return;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      setSlides(next);
    },
    [setSlides],
  );

  const duplicateSlide = useCallback(
    (index: number) => {
      const current = latest.current.doc.slides ?? [];
      if (!current[index]) return;
      const copy: Slide = {
        ...current[index],
        id: uid(),
        label: `${current[index].label} (copy)`,
      };
      const next = [...current];
      next.splice(index + 1, 0, copy);
      setSlides(next);
      setSelectedId(copy.id);
    },
    [setSlides],
  );

  const removeSlide = useCallback(
    (index: number) => {
      const current = latest.current.doc.slides ?? [];
      if (!current[index]) return;
      const next = current.filter((_, i) => i !== index);
      setSlides(next);
      if (current[index].id === latest.current.selectedId)
        setSelectedId(next[Math.max(0, index - 1)]?.id ?? null);
    },
    [setSlides],
  );

  const insertSlideAt = useCallback(
    (index: number) => {
      const slide = blankSlide();
      const next = [...(latest.current.doc.slides ?? [])];
      next.splice(index, 0, slide);
      setSlides(next);
      setSelectedId(slide.id);
    },
    [setSlides],
  );

  const splitSlide = useCallback(
    (index: number) => {
      const current = latest.current.doc.slides ?? [];
      const slide = current[index];
      if (!slide?.lines || slide.lines.length < 2) return;
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
        lineOverrides: Object.keys(firstOverrides).length
          ? firstOverrides
          : undefined,
      };
      const second: Slide = {
        ...slide,
        id: uid(),
        lines: slide.lines.slice(mid),
        label: `${slide.label} (b)`,
        lineOverrides: Object.keys(secondOverrides).length
          ? secondOverrides
          : undefined,
      };
      const next = [...current];
      next.splice(index, 1, first, second);
      setSlides(next);
    },
    [setSlides],
  );

  const mergeSlideDown = useCallback(
    (index: number) => {
      const current = latest.current.doc.slides ?? [];
      if (index >= current.length - 1) return;
      const a = current[index];
      const b = current[index + 1];
      const offset = a.lines.length;
      const lineOverrides: Record<number, TextStyle> = {
        ...(a.lineOverrides || {}),
      };
      Object.entries(b.lineOverrides || {}).forEach(([i, v]) => {
        lineOverrides[Number(i) + offset] = v;
      });
      const merged: Slide = {
        ...a,
        lines: [...a.lines, ...b.lines],
        lineOverrides: Object.keys(lineOverrides).length
          ? lineOverrides
          : undefined,
      };
      const next = [...current];
      next.splice(index, 2, merged);
      setSlides(next);
      setSelectedId(merged.id);
    },
    [setSlides],
  );

  const replaceSlides = useCallback(
    (next: Slide[]) => {
      setSlides(next);
      setSelectedId(next[0]?.id ?? null);
    },
    [setSlides],
  );

  const stepHistory = useCallback(
    (back: boolean, caret: TextRange | null): TextRange | null => {
      const { doc: current, selectedId: currentId } = latest.current;
      const from = back ? latest.current.past : latest.current.future;
      const entry = from[from.length - 1];
      if (!entry) return null;

      const trim = (entries: HistoryEntry<T>[]) => entries.slice(0, -1);
      const push = (entries: HistoryEntry<T>[]) =>
        [...entries, { doc: current, selectedId: currentId, caret }].slice(
          -HISTORY_LIMIT,
        );

      if (back) {
        setPast(trim);
        setFuture(push);
      } else {
        setFuture(trim);
        setPast(push);
      }
      coalesceRef.current = null;
      setDoc(entry.doc);
      setSelectedId(entry.selectedId);
      return entry.caret;
    },
    [],
  );

  const undo = useCallback(
    (caret: TextRange | null = null) => stepHistory(true, caret),
    [stepHistory],
  );

  const redo = useCallback(
    (caret: TextRange | null = null) => stepHistory(false, caret),
    [stepHistory],
  );

  /** Writes the draft to the library. False when the store refused it. */
  const save = useCallback((): boolean => {
    const current = latest.current.doc;
    if (!commit(current)) return false;
    setSaved(current);
    return true;
  }, [commit]);

  const history = useMemo<EditHistory>(
    () => ({
      canUndo: past.length > 0,
      canRedo: future.length > 0,
      undo,
      redo,
    }),
    [past.length, future.length, undo, redo],
  );

  return {
    doc,
    slides,
    selectedId,
    setSelectedId,
    selectedIndex,
    selectedSlide,
    dirty: doc !== saved,
    save,
    history,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    undo,
    redo,
    patchDoc,
    setSlides,
    replaceSlides,
    updateSlide,
    setSlideText,
    updateSlideOverride,
    patchSlideOverrides,
    updateLineOverride,
    updateLineOverrides,
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
