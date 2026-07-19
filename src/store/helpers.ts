import type { AudioItem, Background, Theme } from "../types";
import { THEMES } from "../data/themes";
import type { Getter } from "./storeTypes";

export const BLOCK_MSG =
  "Storage is full. Editing, creating, uploading and auto-save are paused until you free up space. Delete some songs, media, audio or backgrounds.";
export const WARN_MSG =
  "Storage is getting full. Consider deleting unused songs, media, audio or backgrounds so things keep running smoothly.";

export const customBackgrounds = (items: Background[]) => items.filter((b) => !b.builtIn);
export const customAudio = (items: AudioItem[]) => items.filter((a) => !a.builtIn);

// Returns true (and alerts) when an additive write must be blocked.
export function blockWrite(get: Getter): boolean {
  if (get().storage?.blocked) {
    get().pushAlert(BLOCK_MSG, "error", "storage-block");
    return true;
  }
  return false;
}

// Recompute usage after an additive write and warn if we're in the warning band.
export function afterWrite(get: Getter): void {
  void get()
    .refreshStorage()
    .then((info) => {
      if (!info) return;
      if (!info.blocked && info.level !== "ok") get().pushAlert(WARN_MSG, "warning", "storage-warn");
      else if (info.level === "ok") get().clearAlert("storage-warn");
    });
}

// Recompute usage after a delete and lift block/warn alerts once recovered.
export function afterDelete(get: Getter): void {
  void get()
    .refreshStorage()
    .then((info) => {
      if (!info || info.blocked) return;
      get().clearAlert("storage-block");
      if (info.level === "ok") get().clearAlert("storage-warn");
    });
}

export function mergeById<T extends { id: string }>(
  existing: T[],
  incoming: T[],
  importedWins: boolean
): T[] {
  const map = new Map<string, T>();
  for (const item of importedWins ? existing : incoming) map.set(item.id, item);
  for (const item of importedWins ? incoming : existing) map.set(item.id, item);
  return [...map.values()];
}

/** Puts built-in themes first, ordered by their position in THEMES, then custom themes. */
export function sortBuiltInFirst(themes: Theme[]): Theme[] {
  const order = THEMES.map((t) => t.id);
  return [...themes].sort((a, b) => {
    const ai = order.indexOf(a.id);
    const bi = order.indexOf(b.id);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return 0;
  });
}

export function ensureBuiltInThemes(themes: Theme[]): Theme[] {
  const present = new Set(themes.map((t) => t.id));
  return sortBuiltInFirst([...themes, ...THEMES.filter((t) => !present.has(t.id))]);
}
