import type { ContentKind, PresentTarget } from "../../types";
import type { SliceCreator } from "../storeTypes";

export interface PresentSlice {
  presentation: PresentTarget | null;

  startPresent: (kind: ContentKind, id: string, startIndex?: number) => void;
  stopPresent: () => void;
}

export const createPresentSlice: SliceCreator<PresentSlice> = (set, get) => ({
  presentation: null,

  startPresent: (kind, id, startIndex = 0) => {
    const state = get();
    const canPresent =
      kind === "song"
        ? Boolean(state.songs.find((s) => s.id === id)?.slides?.length)
        : kind === "scripture"
          ? Boolean(state.scriptures.find((s) => s.id === id)?.slides?.length)
          : state.media.some((m) => m.id === id && m.kind === kind);
    if (canPresent) set({ presentation: { kind, id, startIndex } });
  },

  stopPresent: () => set({ presentation: null }),
});
