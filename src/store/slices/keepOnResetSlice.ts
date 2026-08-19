import { keepMark } from "../../lib/libraryMarks";
import {
  MAX_KEPT_ITEMS,
  canKeep,
  keptCount,
  type KeepableKind,
} from "../../lib/keepOnReset";
import type { SliceCreator } from "../storeTypes";

export interface KeepOnResetSlice {
  /**
   * Registers (or un-registers) a manuscript or custom theme as "keep on
   * reset". Refuses once all five slots are taken; un-registering is always
   * allowed.
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
      kind === "manuscript"
        ? state.manuscripts.find((m) => m.id === id)
        : state.themes.find((t) => t.id === id);
    if (!item || !canKeep(item)) return;

    const registering = !item.keepOnReset;
    if (
      registering &&
      keptCount(state.manuscripts, state.themes) >= MAX_KEPT_ITEMS
    ) {
      state.pushToast(
        `You can keep ${MAX_KEPT_ITEMS} items through a reset. Unkeep one first.`,
        "error",
      );
      return;
    }

    // `undefined` rather than `false` so un-kept records stay as small as they
    // were before the feature existed.
    const keepOnReset = registering ? true : undefined;
    // Keeping an item is not an edit, so `updatedAt` is left where the last
    // edit put it and the toggle is recorded as a mark instead.
    const mark = keepMark(registering);
    let label: string;
    if (kind === "manuscript") {
      const manuscript = state.manuscripts.find((m) => m.id === id);
      if (!manuscript) return;
      label = manuscript.title;
      state.upsertManuscript({ ...manuscript, keepOnReset, mark });
    } else {
      const theme = state.themes.find((t) => t.id === id);
      if (!theme) return;
      label = theme.name;
      state.upsertTheme({ ...theme, keepOnReset, mark }, { touch: false });
    }

    state.pushToast(
      registering
        ? `${label} will survive a reset.`
        : `${label} will no longer survive a reset.`,
    );
  },
});
