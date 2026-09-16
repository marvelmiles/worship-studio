import type {
  ContentKind,
  MediaItem,
  PipPlacement,
  PresentTarget,
  SlideDeckDoc,
} from "../../types";
import { presentLiveWindow } from "../../lib/liveWindow";
import type {
  MediaPlayback,
  MediaSync,
  SecondaryModuleKind,
} from "../../lib/presentChannel";
import {
  DEFAULT_PIP_PLACEMENT,
  normalisePipPlacement,
} from "../../lib/pipPlacement";
import type { SliceCreator } from "../storeTypes";

export type PresentationMode = "stage" | "pip";

export interface PresentedDeck {
  kind: ContentKind;
  id: string;
  doc?: SlideDeckDoc;
  item?: MediaItem;
}

const pinnedContent = (
  kind: ContentKind,
  doc: SlideDeckDoc | undefined,
  item: MediaItem | undefined,
): PresentedDeck | null =>
  doc ? { kind, id: doc.id, doc } : item ? { kind, id: item.id, item } : null;

export interface PresentedMedia {
  playback: MediaPlayback;
  sync: MediaSync;
}

export interface SecondaryPresentation {
  kind: SecondaryModuleKind;
  id: string;
  item?: MediaItem;
  placement: PipPlacement;
  muted: boolean;
}

export const LIVE_CAMERA_ID = "live-camera";

export interface PresentSlice {
  presentation: PresentTarget | null;
  presentationMode: PresentationMode;
  presentationIndex: number;
  presentedDeck: PresentedDeck | null;
  presentedMedia: PresentedMedia | null;
  secondaryPresentation: SecondaryPresentation | null;

  startPresent: (
    kind: ContentKind,
    id: string,
    startIndex?: number,
    mode?: PresentationMode,
  ) => void;
  setPresentationMode: (mode: PresentationMode) => void;
  setPresentationIndex: (index: number) => void;
  updatePresentation: (kind: ContentKind, doc: SlideDeckDoc) => boolean;
  updateMediaPresentation: (item: MediaItem) => boolean;
  publishPresentedMedia: (state: PresentedMedia | null) => void;

  presentSecondary: (kind: SecondaryModuleKind, id?: string) => boolean;
  patchSecondaryPlacement: (patch: Partial<PipPlacement>) => void;
  setSecondaryMuted: (muted: boolean) => void;
  stopSecondary: () => void;

  stopPresent: () => void;
}

export const createPresentSlice: SliceCreator<PresentSlice> = (set, get) => ({
  presentation: null,
  presentationMode: "stage",
  presentationIndex: 0,
  presentedDeck: null,
  presentedMedia: null,
  secondaryPresentation: null,

  startPresent: (kind, id, startIndex = 0, mode = "stage") => {
    const state = get();
    const deckDoc =
      kind === "manuscript"
        ? state.manuscripts.find((m) => m.id === id)
        : kind === "scripture"
          ? state.scriptures.find((s) => s.id === id)
          : undefined;
    const mediaItem =
      kind === "image" || kind === "video"
        ? state.media.find((m) => m.id === id && m.kind === kind)
        : undefined;
    const canPresent =
      kind === "manuscript" || kind === "scripture"
        ? Boolean(deckDoc?.slides?.length)
        : Boolean(mediaItem);
    if (canPresent)
      set({
        presentation: { kind, id, startIndex },
        presentationMode: mode,
        presentationIndex: startIndex,
        presentedDeck: pinnedContent(kind, deckDoc, mediaItem),
        presentedMedia: null,
        secondaryPresentation: null,
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

  updateMediaPresentation: (item) => {
    const { presentation, secondaryPresentation } = get();
    const onSecondary =
      secondaryPresentation?.kind === item.kind &&
      secondaryPresentation.id === item.id;
    const onMain =
      presentation?.kind === item.kind && presentation.id === item.id;
    if (!onMain && !onSecondary) return false;
    set({
      ...(onMain
        ? { presentedDeck: { kind: item.kind, id: item.id, item } }
        : {}),
      ...(onSecondary && secondaryPresentation
        ? { secondaryPresentation: { ...secondaryPresentation, item } }
        : {}),
    });
    return true;
  },

  publishPresentedMedia: (state) => set({ presentedMedia: state }),

  presentSecondary: (kind, id = LIVE_CAMERA_ID) => {
    const state = get();
    const placement =
      state.secondaryPresentation?.placement ?? DEFAULT_PIP_PLACEMENT;
    if (kind === "stream") {
      set({
        secondaryPresentation: {
          kind,
          id: LIVE_CAMERA_ID,
          placement,
          muted: true,
        },
      });
      return true;
    }
    const item = state.media.find((m) => m.id === id && m.kind === kind);
    if (!item) return false;
    set({
      secondaryPresentation: {
        kind,
        id,
        item,
        placement,
        muted: true,
      },
    });
    return true;
  },

  patchSecondaryPlacement: (patch) => {
    const current = get().secondaryPresentation;
    if (!current) return;
    set({
      secondaryPresentation: {
        ...current,
        placement: normalisePipPlacement({ ...current.placement, ...patch }),
      },
    });
  },

  setSecondaryMuted: (muted) => {
    const current = get().secondaryPresentation;
    if (!current) return;
    set({ secondaryPresentation: { ...current, muted } });
  },

  stopSecondary: () => set({ secondaryPresentation: null }),

  stopPresent: () => {
    presentLiveWindow.endLive();
    set({
      presentation: null,
      presentationMode: "stage",
      presentationIndex: 0,
      presentedDeck: null,
      presentedMedia: null,
      secondaryPresentation: null,
    });
  },
});
