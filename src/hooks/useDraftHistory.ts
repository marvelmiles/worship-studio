import { useCallback, useRef, useState } from "react";

const HISTORY_LIMIT = 200;
const COALESCE_MS = 600;

export interface DraftEditOptions {
  coalesceKey?: string;
}

export interface DraftHistory<T> {
  draft: T;
  dirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  apply: (next: T, options?: DraftEditOptions) => void;
  patch: (changes: Partial<T>, options?: DraftEditOptions) => void;
  undo: () => void;
  redo: () => void;
  markSaved: () => void;
  reset: (next: T) => void;
}

export const useDraftHistory = <T>(initial: T): DraftHistory<T> => {
  const [draft, setDraft] = useState<T>(initial);
  const [saved, setSaved] = useState<T>(initial);
  const [past, setPast] = useState<T[]>([]);
  const [future, setFuture] = useState<T[]>([]);
  const coalesce = useRef<{ key: string; at: number } | null>(null);

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
};
