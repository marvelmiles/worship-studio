import type { ContentKind, PresentTarget, SlideDeckDoc } from "../../types";
import { endLive } from "../../lib/liveWindow";
import type { SliceCreator } from "../storeTypes";

/**
 * "stage" takes over the whole screen; "pip" shrinks the presentation into a
 * small floating presenter so the operator can keep using the app while the
 * audience display stays live.
 */
export type PresentationMode = "stage" | "pip";

/** The exact document the presentation is running on, pinned for the whole run. */
export interface PresentedDeck {
  kind: ContentKind;
  id: string;
  doc: SlideDeckDoc;
}

const presentedDeckFor = (
  kind: ContentKind,
  doc: SlideDeckDoc | undefined,
): PresentedDeck | null => (doc ? { kind, id: doc.id, doc } : null);

export interface PresentSlice {
  presentation: PresentTarget | null;
  presentationMode: PresentationMode;
  /**
   * Slide the presentation is currently on, published by the presenter so the
   * rest of the app (the editor's slide list) can follow along live.
   */
  presentationIndex: number;
  /**
   * What the presentation renders, taken when it started, whether it is
   * projected or previewing on this screen. Editing a document mid-service
   * never moves the screen on its own; the operator pushes changes out
   * deliberately with `updatePresentation`.
   */
  presentedDeck: PresentedDeck | null;

  startPresent: (
    kind: ContentKind,
    id: string,
    startIndex?: number,
    mode?: PresentationMode,
  ) => void;
  setPresentationMode: (mode: PresentationMode) => void;
  setPresentationIndex: (index: number) => void;
  /**
   * Replaces what the running presentation shows with the operator's current
   * version. False when this document is not the one being presented.
   */
  updatePresentation: (kind: ContentKind, doc: SlideDeckDoc) => boolean;
  stopPresent: () => void;
}

export const createPresentSlice: SliceCreator<PresentSlice> = (set, get) => ({
  presentation: null,
  presentationMode: "stage",
  presentationIndex: 0,
  presentedDeck: null,

  startPresent: (kind, id, startIndex = 0, mode = "stage") => {
    const state = get();
    const deckDoc =
      kind === "manuscript"
        ? state.manuscripts.find((m) => m.id === id)
        : kind === "scripture"
          ? state.scriptures.find((s) => s.id === id)
          : undefined;
    const canPresent =
      kind === "manuscript" || kind === "scripture"
        ? Boolean(deckDoc?.slides?.length)
        : state.media.some((m) => m.id === id && m.kind === kind);
    if (canPresent)
      set({
        presentation: { kind, id, startIndex },
        presentationMode: mode,
        presentationIndex: startIndex,
        presentedDeck: presentedDeckFor(kind, deckDoc),
      });
  },

  setPresentationMode: (mode) => set({ presentationMode: mode }),

  setPresentationIndex: (index) => set({ presentationIndex: index }),

  updatePresentation: (kind, doc) => {
    const { presentation } = get();
    if (presentation?.kind !== kind || presentation.id !== doc.id) return false;
    set({ presentedDeck: { kind, id: doc.id, doc } });
    return true;
  },

  stopPresent: () => {
    // Ending the presentation always takes the projected window with it,
    // otherwise the audience keeps seeing a stage nothing is driving.
    endLive();
    set({
      presentation: null,
      presentationMode: "stage",
      presentationIndex: 0,
      presentedDeck: null,
    });
  },
});
