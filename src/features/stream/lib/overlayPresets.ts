import type {
  Background,
  Manuscript,
  MediaItem,
  ScripturePassage,
} from "../../../types";
import { uid } from "../../../lib/id";
import {
  editedOverlay,
  isMarquee,
  type ContentOverlay,
  type MarqueeOverlay,
  type StreamOverlay,
  type StreamOverlayKind,
} from "./streamOverlay";

/** An overlay as it is kept for later: everything but where it is right now. */
type Reusable<TOverlay extends StreamOverlay> = Omit<
  TOverlay,
  "id" | "status" | "pending"
>;

export type SavedOverlay = Reusable<ContentOverlay> | Reusable<MarqueeOverlay>;

export interface StreamOverlayPreset {
  id: string;
  name: string;
  overlay: SavedOverlay;
  createdAt: string;
  updatedAt: string;
}

/** Anything that may point at a document, passage, picture or clip. */
export interface OverlayContentRef {
  kind: StreamOverlayKind;
  contentId?: string;
}

export const contentIdsOf = (
  overlays: readonly OverlayContentRef[],
): string[] =>
  overlays.flatMap((overlay) =>
    overlay.kind !== "marquee" && overlay.contentId ? [overlay.contentId] : [],
  );

export const isSavedMarquee = (
  saved: SavedOverlay,
): saved is Reusable<MarqueeOverlay> => saved.kind === "marquee";

export const toSavedOverlay = (overlay: StreamOverlay): SavedOverlay => {
  const settled = { ...editedOverlay(overlay) } as Partial<StreamOverlay>;
  delete settled.id;
  delete settled.status;
  delete settled.pending;
  return settled as SavedOverlay;
};

/** A fresh, off-air overlay built from what was saved. */
export const fromSavedOverlay = (saved: SavedOverlay): StreamOverlay =>
  ({
    ...saved,
    id: uid(),
    status: "draft",
    hidden: false,
    pending: null,
  }) as StreamOverlay;

export interface OverlayContentLibrary {
  manuscripts: Manuscript[];
  scriptures: ScripturePassage[];
  media: MediaItem[];
  backgrounds: Background[];
}

/**
 * Whether what a saved overlay stands on is still here. An announcement always
 * is; everything else is only as good as the document, passage, picture or
 * clip it was saved from.
 */
export const isSavedOverlayReady = (
  saved: SavedOverlay,
  library: OverlayContentLibrary,
): boolean => {
  if (isSavedMarquee(saved)) return true;
  const { contentId } = saved;
  if (saved.kind === "manuscript")
    return library.manuscripts.some(
      (doc) => doc.id === contentId && !doc.deleted,
    );
  if (saved.kind === "scripture")
    return library.scriptures.some((doc) => doc.id === contentId);
  if (saved.source === "background")
    return library.backgrounds.some((entry) => entry.id === contentId);
  return library.media.some((item) => item.id === contentId);
};

const MAX_PRESET_NAME_LENGTH = 60;

/** What to call an overlay before the person types a name of their own. */
export const suggestedPresetName = (overlay: StreamOverlay): string => {
  const source = isMarquee(overlay) ? overlay.text : overlay.label;
  const trimmed = source.trim();
  if (!trimmed) return "Saved overlay";
  return trimmed.length > MAX_PRESET_NAME_LENGTH
    ? `${trimmed.slice(0, MAX_PRESET_NAME_LENGTH).trimEnd()}…`
    : trimmed;
};
