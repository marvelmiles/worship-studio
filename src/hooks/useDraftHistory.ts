import { useCallback, useRef, useState } from "react";

/** Steps kept for one editing session, bounded so a long service stays cheap. */
const HISTORY_LIMIT = 200;
/** Changes this close together under one key fold into a single undo step. */
const COALESCE_MS = 600;

export interface DraftEditOptions {
  /** Consecutive edits sharing a key fold into one undo step, as a slider drag does. */
  coalesceKey?: string;
}

export interface DraftHistory<T> {
  draft: T;
  /** True while the draft differs from what was last saved. */
  dirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  /** Replaces the draft, pushing an undo step. */
  apply: (next: T, options?: DraftEditOptions) => void;
  /** The same, from the current draft. */
  patch: (changes: Partial<T>, options?: DraftEditOptions) => void;
  undo: () => void;
  redo: () => void;
  /** Marks the current draft as the saved one, so it stops reading as dirty. */
  markSaved: () => void;
  /** Drops the session and starts again from `next`, history and all. */
  reset: (next: T) => void;
}

/**
 * One editing session over a plain draft object, with the undo stack an editor
 * is expected to have.
 *
 * Nothing is written anywhere: the caller decides what saving means and calls
 * `markSaved` once it has happened, which is what keeps this usable for a
 * library record, a settings sheet or anything else edited against a draft.
 */
export function useDraftHistory<T>(initial: T): DraftHistory<T> {
  const [draft, setDraft] = useState<T>(initial);
  const [saved, setSaved] = useState<T>(initial);
  const [past, setPast] = useState<T[]>([]);
  const [future, setFuture] = useState<T[]>([]);
  const coalesce = useRef<{ key: string; at: number } | null>(null);

  // Mirrored so every command below stays referentially stable.
  const latest = useRef(draft);
  latest.current = draft;

  const apply = useCallback((next: T, options?: DraftEditOptions) => {
    const current = latest.current;
    const at = Date.now();
    const key = options?.coalesceKey;
    const merge = Boolean(
      key &&
      coalesce.current?.key === key &&
      at - coalesce.current.at < COALESCE_MS,
    );
    coalesce.current = key ? { key, at } : null;

    if (!merge) {
      setPast((entries) => [...entries, current].slice(-HISTORY_LIMIT));
      setFuture([]);
    }
    setDraft(next);
  }, []);

  const patch = useCallback(
    (changes: Partial<T>, options?: DraftEditOptions) =>
      apply({ ...latest.current, ...changes }, options),
    [apply],
  );

  const step = useCallback(
    (back: boolean) => {
      const from = back ? past : future;
      const entry = from[from.length - 1];
      if (entry === undefined) return;
      const trim = (entries: T[]) => entries.slice(0, -1);
      const push = (entries: T[]) =>
        [...entries, latest.current].slice(-HISTORY_LIMIT);
      if (back) {
        setPast(trim);
        setFuture(push);
      } else {
        setFuture(trim);
        setPast(push);
      }
      coalesce.current = null;
      setDraft(entry);
    },
    [past, future],
  );

  const undo = useCallback(() => step(true), [step]);
  const redo = useCallback(() => step(false), [step]);

  const markSaved = useCallback(() => setSaved(latest.current), []);

  const reset = useCallback((next: T) => {
    coalesce.current = null;
    setPast([]);
    setFuture([]);
    setDraft(next);
    setSaved(next);
  }, []);

  return {
    draft,
    dirty: draft !== saved,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    apply,
    patch,
    undo,
    redo,
    markSaved,
    reset,
  };
}
