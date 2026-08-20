import type {
  ContentKind,
  MediaItem,
  PipPlacement,
  PresentTarget,
  SlideDeckDoc,
} from "../../types";
import { endLive } from "../../lib/liveWindow";
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

/**
 * "stage" takes over the whole screen; "pip" shrinks the presentation into a
 * small floating presenter so the operator can keep using the app while the
 * audience display stays live.
 */
export type PresentationMode = "stage" | "pip";

/**
 * The exact content the presentation is running on, pinned for the whole run:
 * the document for a manuscript or a passage, the library item for a picture or
 * a clip. Either way the screen only moves when the operator pushes a new
 * version out with `updatePresentation`.
 */
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

/**
 * Where the running presentation's clip actually is, published by the presenter
 * so the rest of the app can pick the same state up.
 *
 * The position is a reading rather than a live value: it carries the wall clock
 * it was taken at, so a consumer works out where the clip has got to with
 * `syncedPosition` instead of the presenter having to publish on a tick and
 * re-render half the app four times a second.
 */
export interface PresentedMedia {
  playback: MediaPlayback;
  sync: MediaSync;
}

/**
 * A second module running in a corner of the stage beside the main one: the
 * announcement clip under a sermon, the camera feed beside a passage.
 *
 * It is deliberately not a second presentation. There is one running order, one
 * set of shortcuts and one Go Live; this is a window laid over that stage, whose
 * content the operator can swap, move, resize, silence and drop without ever
 * touching what the main module is doing.
 */
export interface SecondaryPresentation {
  kind: SecondaryModuleKind;
  /** Library id of the picture or clip. The live camera has none. */
  id: string;
  /** The version being shown, pinned the way the main deck's is. */
  item?: MediaItem;
  placement: PipPlacement;
  muted: boolean;
}

/** The id a live-camera secondary carries, so one field identifies every kind. */
export const LIVE_CAMERA_ID = "live-camera";

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
  /** Set only while the presentation is running a clip. */
  presentedMedia: PresentedMedia | null;
  /**
   * The second module shown in a corner of the stage, or null when the main one
   * has the screen to itself.
   */
  secondaryPresentation: SecondaryPresentation | null;

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
  /** The same for a picture or a clip, pushed from the media editor. */
  updateMediaPresentation: (item: MediaItem) => boolean;
  /** Publishes the running clip's transport, or clears it when none is on. */
  publishPresentedMedia: (state: PresentedMedia | null) => void;

  /**
   * Shows a picture, a clip or the live camera in the corner window, replacing
   * whatever was there. False when the requested item is not in the library.
   */
  presentSecondary: (kind: SecondaryModuleKind, id?: string) => boolean;
  /** Moves or resizes the corner window. */
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
        // A corner window belongs to the run it was set up for, so a new
        // presentation opens on the main module alone rather than inheriting
        // the last service's clip.
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
    // The same picture or clip can be on the main stage, in the corner window,
    // or both, and an operator pushing their edit out means all of them.
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
        // A corner window is a second picture, not a second soundtrack: the
        // main module keeps the room's ears unless the operator says otherwise.
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
    // Ending the presentation always takes the projected window with it,
    // otherwise the audience keeps seeing a stage nothing is driving.
    endLive();
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
