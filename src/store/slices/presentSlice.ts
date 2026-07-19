import type { ContentKind, PresentTarget } from "../../types";
import { endLive } from "../../lib/liveWindow";
import type { SliceCreator } from "../storeTypes";

/**
 * "stage" takes over the whole screen; "pip" shrinks the presentation into a
 * small floating presenter so the operator can keep using the app while the
 * audience display stays live.
 */
export type PresentationMode = "stage" | "pip";

export interface PresentSlice {
  presentation: PresentTarget | null;
  presentationMode: PresentationMode;

  startPresent: (
    kind: ContentKind,
    id: string,
    startIndex?: number,
    mode?: PresentationMode
  ) => void;
  setPresentationMode: (mode: PresentationMode) => void;
  stopPresent: () => void;
}

export const createPresentSlice: SliceCreator<PresentSlice> = (set, get) => ({
  presentation: null,
  presentationMode: "stage",

  startPresent: (kind, id, startIndex = 0, mode = "stage") => {
    const state = get();
    const canPresent =
      kind === "song"
        ? Boolean(state.songs.find((s) => s.id === id)?.slides?.length)
        : kind === "scripture"
          ? Boolean(state.scriptures.find((s) => s.id === id)?.slides?.length)
          : state.media.some((m) => m.id === id && m.kind === kind);
    if (canPresent) set({ presentation: { kind, id, startIndex }, presentationMode: mode });
  },

  setPresentationMode: (mode) => set({ presentationMode: mode }),

  stopPresent: () => {
    // Ending the presentation always takes the projected window with it,
    // otherwise the audience keeps seeing a stage nothing is driving.
    endLive();
    set({ presentation: null, presentationMode: "stage" });
  },
});
