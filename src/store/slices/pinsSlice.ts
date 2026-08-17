import { now } from "../../lib/id";
import {
  MAX_PINNED_ITEMS,
  pinnedCount,
  type Pinnable,
  type PinnableKind,
} from "../../lib/pinning";
import type { Getter, SliceCreator } from "../storeTypes";

export interface PinsSlice {
  /**
   * Pins or unpins one library item. Refuses once that library's five slots are
   * taken; unpinning is always allowed.
   */
  togglePin: (kind: PinnableKind, id: string) => void;
}

/** What the toast calls the library whose slots are full. */
const LIBRARY_LABELS: Record<PinnableKind, string> = {
  manuscript: "manuscripts",
  scripture: "passages",
  image: "images",
  video: "videos",
};

interface PinTarget {
  name: string;
  pinned: boolean;
  /** Everything competing for the same five slots. */
  siblings: Pinnable[];
  write: (pinned: true | undefined) => void;
}

/** Finds the item behind a pin and how to write it back to its own library. */
function pinTarget(
  get: Getter,
  kind: PinnableKind,
  id: string,
): PinTarget | null {
  const state = get();

  if (kind === "manuscript") {
    const manuscript = state.manuscripts.find((m) => m.id === id);
    if (!manuscript || manuscript.deleted) return null;
    return {
      name: manuscript.title,
      pinned: Boolean(manuscript.pinned),
      siblings: state.manuscripts,
      write: (pinned) =>
        state.upsertManuscript({ ...manuscript, pinned, updatedAt: now() }),
    };
  }

  if (kind === "scripture") {
    const passage = state.scriptures.find((s) => s.id === id);
    if (!passage || passage.deleted || passage.quick) return null;
    return {
      name: passage.title,
      pinned: Boolean(passage.pinned),
      siblings: state.scriptures.filter((s) => !s.quick),
      write: (pinned) =>
        state.upsertScripture({ ...passage, pinned, updatedAt: now() }),
    };
  }

  const item = state.media.find((m) => m.id === id && m.kind === kind);
  if (!item) return null;
  return {
    name: item.name,
    pinned: Boolean(item.pinned),
    siblings: state.media.filter((m) => m.kind === kind),
    write: (pinned) => state.updateMedia(item.id, { pinned }),
  };
}

export const createPinsSlice: SliceCreator<PinsSlice> = (_set, get) => ({
  togglePin: (kind, id) => {
    const target = pinTarget(get, kind, id);
    if (!target) return;

    const pinning = !target.pinned;
    if (pinning && pinnedCount(target.siblings) >= MAX_PINNED_ITEMS) {
      get().pushToast(
        `You can pin ${MAX_PINNED_ITEMS} ${LIBRARY_LABELS[kind]}. Unpin one first.`,
        "error",
      );
      return;
    }

    // `undefined` rather than `false` so an unpinned record stays as small as
    // it was before the feature existed.
    target.write(pinning ? true : undefined);
    get().pushToast(
      pinning ? `Pinned "${target.name}".` : `Unpinned "${target.name}".`,
    );
  },
});
