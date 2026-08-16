import { useCallback, useMemo, useRef, useState } from "react";
import type {
  Slide,
  SlideDeckDoc,
  SlideElementKind,
  SlideFrame,
  SlideMedia,
  SlideOverrides,
  SlideTextBox,
  TextStyle,
} from "../../types";
import { now, uid } from "../../lib/id";
import { clampFrame } from "../../lib/slideMedia";
import { textCarrierOf, withCarrierText } from "../../lib/slideTextBox";
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

/** The two collections of placements a slide carries, keyed by what is in them. */
type SlideListKey = "media" | "textBoxes";

const listKeyFor = (kind: SlideElementKind): SlideListKey =>
  kind === "text" ? "textBoxes" : "media";

/** Anything that can sit in one of those collections. */
interface Placed {
  id: string;
  frame: SlideFrame;
}

/** Writes one style property, dropping it when the value is cleared. */
function withStyleKey(
  style: TextStyle | undefined,
  key: string,
  value: unknown,
): TextStyle {
  const next = { ...(style ?? {}) } as Record<string, unknown>;
  if (value === "" || value == null) delete next[key];
  else next[key] = value;
  return next as TextStyle;
}

/** The same, across several lines at once, dropping lines left with nothing. */
function withLineStyleKey(
  lineOverrides: Record<number, TextStyle> | undefined,
  lineIndexes: number[],
  key: string,
  value: unknown,
): Record<number, TextStyle> {
  const next = { ...(lineOverrides ?? {}) };
  for (const lineIndex of lineIndexes) {
    const line = withStyleKey(next[lineIndex], key, value);
    if (Object.keys(line).length) next[lineIndex] = line;
    else delete next[lineIndex];
  }
  return next;
}

/** Drops the per-line styles of lines a rewrite left behind. */
const trimLineOverrides = (
  lineOverrides: Record<number, TextStyle> | undefined,
  lineCount: number,
): Record<number, TextStyle> | undefined =>
  lineOverrides
    ? Object.fromEntries(
        Object.entries(lineOverrides).filter(
          ([index]) => Number(index) < lineCount,
        ),
      )
    : undefined;

/** Steps kept for one editing session, bounded so a long service stays cheap. */
const HISTORY_LIMIT = 200;
/** Keystrokes this close together undo as one step, the way Word groups them. */
const COALESCE_MS = 600;
/** Percent of the slide a duplicated picture is nudged by, so it stays visible. */
const DUPLICATE_OFFSET = 3;

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

  const slideOf = useCallback(
    (id: string): Slide | undefined =>
      (latest.current.doc.slides ?? []).find((item) => item.id === id),
    [],
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
      // Dragging a slider fires continuously; the whole drag is one undo step.
      updateSlide(
        id,
        { overrides: withStyleKey(slide.overrides, key, value) },
        { coalesceKey: `override:${id}:${key}` },
      );
    },
    [slideOf, updateSlide],
  );

  /**
   * Several override keys in one undo step. Choosing a background writes the
   * picture settings that come with it, and both belong to the same step.
   */
  const patchSlideOverrides = useCallback(
    (id: string, changes: Partial<SlideOverrides>) => {
      const slide = slideOf(id);
      if (!slide) return;
      let overrides: SlideOverrides = slide.overrides || {};
      for (const [key, value] of Object.entries(changes))
        overrides = withStyleKey(overrides, key, value);
      updateSlide(id, { overrides });
    },
    [slideOf, updateSlide],
  );

  /**
   * Writes one text property onto whichever block owns the caret: a placed text
   * box, or the slide itself. One patch for every line at once, because a loop
   * over a single-line form would read stale slides and only the last change
   * would survive.
   */
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
      const drop = (overrides: Record<number, TextStyle> | undefined) => {
        if (!overrides) return undefined;
        const next = { ...overrides };
        delete next[lineIndex];
        return next;
      };
      if (!boxId) {
        updateSlide(id, { lineOverrides: drop(slide.lineOverrides) });
        return;
      }
      updateSlide(id, {
        textBoxes: (slide.textBoxes ?? []).map((box) =>
          box.id === boxId
            ? { ...box, lineOverrides: drop(box.lineOverrides) }
            : box,
        ),
      });
    },
    [slideOf, updateSlide],
  );

  /**
   * Rewrites one of a slide's two collections of placements. `transform`
   * returning null leaves the document alone, which is how a command that found
   * nothing to act on avoids pushing an empty undo step.
   */
  const patchSlideList = useCallback(
    <T extends Placed>(
      id: string,
      key: SlideListKey,
      transform: (list: T[]) => T[] | null,
      options?: EditOptions,
    ): boolean => {
      const slide = slideOf(id);
      if (!slide) return false;
      const next = transform((slide[key] as unknown as T[] | undefined) ?? []);
      if (!next) return false;
      updateSlide(id, { [key]: next } as Partial<Slide>, options);
      return true;
    },
    [slideOf, updateSlide],
  );

  const addSlideMedia = useCallback(
    (id: string, media: SlideMedia) =>
      void patchSlideList<SlideMedia>(id, "media", (list) => [...list, media]),
    [patchSlideList],
  );

  /**
   * Patches one placed picture or clip. Dragging and resizing fire continuously,
   * so callers pass a coalesce key to fold the whole gesture into one undo step.
   */
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

  /** The text-box twin of `setSlideText`, writing back one box's own lines. */
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
      void patchSlideList<Placed>(
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
      void patchSlideList<Placed>(id, listKeyFor(kind), (list) =>
        list.some((item) => item.id === elementId)
          ? list.filter((item) => item.id !== elementId)
          : null,
      ),
    [patchSlideList],
  );

  /** Copies a placement, offset a little so the copy is visible under the cursor. */
  const duplicateSlideElement = useCallback(
    (id: string, kind: SlideElementKind, elementId: string): string | null => {
      const copyId = uid();
      const written = patchSlideList<Placed>(id, listKeyFor(kind), (list) => {
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
      });
      return written ? copyId : null;
    },
    [patchSlideList],
  );

  /** Moves a placement through the stack; the last entry is painted on top. */
  const reorderSlideElement = useCallback(
    (
      id: string,
      kind: SlideElementKind,
      elementId: string,
      direction: number,
    ) =>
      void patchSlideList<Placed>(id, listKeyFor(kind), (list) => {
        const index = list.findIndex((item) => item.id === elementId);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= list.length) return null;
        const next = [...list];
        [next[index], next[target]] = [next[target], next[index]];
        return next;
      }),
    [patchSlideList],
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

  /**
   * Halves a slide's text onto two slides. Whichever block carries the text is
   * the one that is split, so a sermon built out of text boxes divides the same
   * way a stanza of lyrics does.
   */
  const splitSlide = useCallback(
    (index: number) => {
      const current = latest.current.doc.slides ?? [];
      const slide = current[index];
      if (!slide) return;
      const carrier = textCarrierOf(slide);
      if (carrier.lines.length < 2) return;

      const mid = Math.ceil(carrier.lines.length / 2);
      const firstOverrides: Record<number, TextStyle> = {};
      const secondOverrides: Record<number, TextStyle> = {};
      Object.entries(carrier.lineOverrides || {}).forEach(([k, v]) => {
        const i = Number(k);
        if (i < mid) firstOverrides[i] = v;
        else secondOverrides[i - mid] = v;
      });

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

      const first = asSlide(slide, carrier.lines.slice(0, mid), firstOverrides);
      const second = asSlide(
        { ...slide, id: uid(), label: `${slide.label} (b)` },
        carrier.lines.slice(mid),
        secondOverrides,
      );
      const next = [...current];
      next.splice(index, 1, first, second);
      setSlides(next);
    },
    [setSlides],
  );

  /**
   * Folds the next slide into this one: its text joins the block that carries
   * this slide's, and everything it had placed on it comes along rather than
   * being dropped on the floor.
   */
  const mergeSlideDown = useCallback(
    (index: number) => {
      const current = latest.current.doc.slides ?? [];
      if (index >= current.length - 1) return;
      const a = current[index];
      const b = current[index + 1];
      const carrier = textCarrierOf(a);
      const incoming = textCarrierOf(b);
      const offset = carrier.lines.length;

      const lineOverrides: Record<number, TextStyle> = {
        ...(carrier.lineOverrides || {}),
      };
      Object.entries(incoming.lineOverrides || {}).forEach(([i, v]) => {
        lineOverrides[Number(i) + offset] = v;
      });

      const withPlacements: Slide = {
        ...a,
        media: [...(a.media ?? []), ...(b.media ?? [])],
        textBoxes: [
          ...(a.textBoxes ?? []),
          // The box the incoming text was read out of is now part of this
          // slide's own text, so it does not come along a second time.
          ...(b.textBoxes ?? []).filter((box) => box.id !== incoming.boxId),
        ],
      };
      const merged = withCarrierText(
        withPlacements,
        carrier,
        [...carrier.lines, ...incoming.lines],
        Object.keys(lineOverrides).length ? lineOverrides : undefined,
      );

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
    setTextStyle,
    setLineStyles,
    clearLineStyles,
    addSlideMedia,
    updateSlideMedia,
    addSlideTextBox,
    updateSlideTextBox,
    setSlideTextBoxText,
    updateSlideElementFrame,
    removeSlideElement,
    duplicateSlideElement,
    reorderSlideElement,
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
