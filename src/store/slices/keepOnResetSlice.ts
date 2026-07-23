import { now } from "../../lib/id";
import {
  MAX_KEPT_ITEMS,
  canKeep,
  keptCount,
  type KeepableKind,
} from "../../lib/keepOnReset";
import type { SliceCreator } from "../storeTypes";

export interface KeepOnResetSlice {
  /**
   * Registers (or un-registers) a song or custom theme as "keep on reset".
   * Refuses once all five slots are taken; un-registering is always allowed.
   */
  toggleKeepOnReset: (kind: KeepableKind, id: string) => void;
}

export const createKeepOnResetSlice: SliceCreator<KeepOnResetSlice> = (
  _set,
  get,
) => ({
  toggleKeepOnReset: (kind, id) => {
    const state = get();
    const item =
      kind === "song"
        ? state.songs.find((s) => s.id === id)
        : state.themes.find((t) => t.id === id);
    if (!item || !canKeep(item)) return;

    const registering = !item.keepOnReset;
    if (registering && keptCount(state.songs, state.themes) >= MAX_KEPT_ITEMS) {
      state.pushToast(
        `You can keep ${MAX_KEPT_ITEMS} items through a reset. Unkeep one first.`,
        "error",
      );
      return;
    }

    // `undefined` rather than `false` so un-kept records stay as small as they
    // were before the feature existed.
    const keepOnReset = registering ? true : undefined;
    let label: string;
    if (kind === "song") {
      const song = state.songs.find((s) => s.id === id);
      if (!song) return;
      label = song.title;
      state.upsertSong({ ...song, keepOnReset, updatedAt: now() });
    } else {
      const theme = state.themes.find((t) => t.id === id);
      if (!theme) return;
      label = theme.name;
      state.upsertTheme({ ...theme, keepOnReset });
    }

    state.pushToast(
      registering
        ? `${label} will survive a reset.`
        : `${label} will no longer survive a reset.`,
    );
  },
});
