import { useCallback, useEffect, useRef, useState } from "react";
import type { Theme } from "../../types";
import { useStore } from "../../store/useStore";
import { validateName } from "../../lib/validation";

export interface ThemeDraftController {
  draft: Theme | null;
  saved: Theme | undefined;
  dirty: boolean;
  nameError: string | null;
  patch: (changes: Partial<Theme>) => void;
  save: () => void;
  discard: () => void;
}

export const useThemeDraft = (
  selectedId: string | null,
): ThemeDraftController => {
  const themes = useStore((s) => s.themes);
  const upsertTheme = useStore((s) => s.upsertTheme);
  const pushToast = useStore((s) => s.pushToast);

  const saved = themes.find((theme) => theme.id === selectedId) ?? themes[0];
  const [draft, setDraft] = useState<Theme | null>(saved ?? null);

  const themesRef = useRef(themes);
  themesRef.current = themes;

  const savedId = saved?.id ?? null;
  useEffect(() => {
    setDraft(themesRef.current.find((theme) => theme.id === savedId) ?? null);
  }, [savedId]);

  const savedKeepOnReset = saved?.keepOnReset;
  useEffect(() => {
    setDraft((current) =>
      current && current.keepOnReset !== savedKeepOnReset
        ? { ...current, keepOnReset: savedKeepOnReset }
        : current,
    );
  }, [savedKeepOnReset]);

  const patch = useCallback(
    (changes: Partial<Theme>) =>
      setDraft((current) => (current ? { ...current, ...changes } : current)),
    [],
  );

  const nameError = draft ? validateName(draft.name, "theme name") : null;
  const dirty = Boolean(
    draft && saved && JSON.stringify(draft) !== JSON.stringify(saved),
  );

  const save = useCallback(() => {
    if (!draft) return;
    const error = validateName(draft.name, "theme name");
    if (error) {
      pushToast(error, "error");
      return;
    }
    const named = { ...draft, name: draft.name.trim() };
    upsertTheme(named);
    pushToast(`Theme "${named.name}" saved.`);
  }, [draft, pushToast, upsertTheme]);

  const discard = useCallback(() => {
    if (saved) setDraft(saved);
  }, [saved]);

  return { draft, saved, dirty, nameError, patch, save, discard };
};
