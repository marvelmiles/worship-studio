import type { LibraryMark } from "../../types";
import { pinMark } from "../../lib/libraryMarks";
import {
  MAX_PINNED_ITEMS,
  pinnedCount,
  type Pinnable,
  type PinnableKind,
} from "../../lib/pinning";
import type { Getter, SliceCreator } from "../storeTypes";

export interface PinsSlice {
  togglePin: (kind: PinnableKind, id: string) => void;
}

const LIBRARY_LABELS: Record<PinnableKind, string> = {
  manuscript: "manuscripts",
  scripture: "passages",
  image: "images",
  video: "videos",
};

interface PinTarget {
  name: string;
  pinned: boolean;
  siblings: Pinnable[];
  write: (pinned: true | undefined, mark: LibraryMark) => void;
}

const pinTarget = (
  get: Getter,
  kind: PinnableKind,
  id: string,
): PinTarget | null => {
  const state = get();

  if (kind === "manuscript") {
    const manuscript = state.manuscripts.find((m) => m.id === id);
    if (!manuscript || manuscript.deleted) return null;
    return {
      name: manuscript.title,
      pinned: Boolean(manuscript.pinned),
      siblings: state.manuscripts,
      write: (pinned, mark) =>
        state.upsertManuscript({ ...manuscript, pinned, mark }),
    };
  }

  if (kind === "scripture") {
    const passage = state.scriptures.find((s) => s.id === id);
    if (!passage || passage.deleted || passage.quick) return null;
    return {
      name: passage.title,
      pinned: Boolean(passage.pinned),
      siblings: state.scriptures.filter((s) => !s.quick),
      write: (pinned, mark) =>
        state.upsertScripture({ ...passage, pinned, mark }),
    };
  }

  const item = state.media.find((m) => m.id === id && m.kind === kind);
  if (!item) return null;
  return {
    name: item.name,
    pinned: Boolean(item.pinned),
    siblings: state.media.filter((m) => m.kind === kind),
    write: (pinned, mark) =>
      state.updateMedia(item.id, { pinned, mark }, { touch: false }),
  };
};

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

    target.write(pinning ? true : undefined, pinMark(pinning));
    get().pushToast(
      pinning ? `Pinned "${target.name}".` : `Unpinned "${target.name}".`,
    );
  },
});
