import { useCallback, useEffect } from "react";
import type { Theme } from "../../types";
import { useStore } from "../../store/useStore";
import { validateName } from "../../lib/validation";
import {
  useDraftHistory,
  type DraftEditOptions,
} from "../../hooks/useDraftHistory";
import { sameTheme, themeDefaults } from "./themeDefaults";

export interface ThemeDraftController {
  draft: Theme | null;
  saved: Theme | undefined;
  dirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  canReset: boolean;
  nameError: string | null;
  patch: (changes: Partial<Theme>, options?: DraftEditOptions) => void;
  undo: () => void;
  redo: () => void;
  resetToDefaults: () => void;
  save: () => void;
}

export const useThemeDraft = (
  selectedId: string | null,
): ThemeDraftController => {
  const themes = useStore((s) => s.themes);
  const upsertTheme = useStore((s) => s.upsertTheme);
  const pushToast = useStore((s) => s.pushToast);

  const saved = themes.find((theme) => theme.id === selectedId) ?? themes[0];
  const savedId = saved?.id ?? null;

  const history = useDraftHistory<Theme | null>(saved ?? null);
  const { draft, apply, commit, reset } = history;

  /* Opening another theme starts a fresh draft and a fresh history. The record
     is read inside the effect so nothing has to be held in a render-time ref. */
  useEffect(() => {
    reset(
      useStore.getState().themes.find((theme) => theme.id === savedId) ?? null,
    );
  }, [savedId, reset]);

  const patch = useCallback(
    (changes: Partial<Theme>, options?: DraftEditOptions) => {
      if (!draft) return;
      apply({ ...draft, ...changes }, options);
    },
    [apply, draft],
  );

  const defaults = draft ? themeDefaults(draft) : null;

  /* Staged like any other edit, so Save still decides and undo can take it
     back. */
  const resetToDefaults = useCallback(() => {
    if (!defaults) return;
    apply(defaults);
    pushToast(`"${defaults.name}" is back to its defaults. Save to keep it.`);
  }, [apply, defaults, pushToast]);

  const save = useCallback(() => {
    if (!draft) return;
    const error = validateName(draft.name, "theme name");
    if (error) {
      pushToast(error, "error");
      return;
    }
    /* keepOnReset and mark belong to the library rather than to this form, so
       the stored record keeps its own values through a save. */
    const stored = useStore
      .getState()
      .themes.find((theme) => theme.id === draft.id);
    const next: Theme = {
      ...draft,
      name: draft.name.trim(),
      keepOnReset: stored?.keepOnReset,
      mark: stored?.mark,
    };
    upsertTheme(next);
    commit(next);
    pushToast(`Theme "${next.name}" saved.`);
  }, [commit, draft, pushToast, upsertTheme]);

  return {
    draft,
    saved,
    dirty: history.dirty,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    canReset: Boolean(draft && defaults && !sameTheme(draft, defaults)),
    nameError: draft ? validateName(draft.name, "theme name") : null,
    patch,
    undo: history.undo,
    redo: history.redo,
    resetToDefaults,
    save,
  };
};
