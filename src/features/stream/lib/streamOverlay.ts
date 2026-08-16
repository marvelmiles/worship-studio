import type { ContentKind, MediaKind, SlideFrame } from "../../../types";
import { uid } from "../../../lib/id";
import { clampFrame } from "../../../lib/slideMedia";

/**
 * What can be laid over a live camera broadcast, and where it sits.
 *
 * Geometry is deliberately the slide editor's: a SlideFrame in percentages of
 * the broadcast box. The broadcast is painted at four wildly different sizes at
 * once — the full-screen stage, the floating PiP, the projector popup and the
 * drag surface the operator edits on — and percentages are what make one
 * placement correct in all of them. It also means clampFrame, the drag/resize
 * overlay and the nudge keys are shared with the deck editor rather than
 * reimplemented here.
 *
 * The model is data only, so it survives being posted through a
 * BroadcastChannel to the projection window (see streamOverlayStore.ts).
 */

/** A marquee is the one overlay that isn't a library document. */
export type StreamOverlayKind = ContentKind | "marquee";

/**
 * Whether an overlay is on air.
 *
 * Everything is added as a draft, and nothing reaches the broadcast until the
 * operator puts it there. Adding a passage means picking it, dropping it
 * roughly into place, sizing it and paging to the right verse — several seconds
 * of fumbling that the room must not watch happen. A draft is therefore visible
 * only on the operator's own arranging surface; the projector, the program
 * monitor and the external display all show live overlays and nothing else.
 *
 * This is also how something is taken back off air: it returns to draft with
 * its placement intact, ready to be brought back without being rebuilt.
 */
export type OverlayStatus = "draft" | "live";

interface StreamOverlayBase {
  id: string;
  frame: SlideFrame;
  /** 0-100, matching placed slide media. */
  opacity: number;
  /** Corner rounding in cqw, so it scales with the broadcast box. */
  radius: number;
  status: OverlayStatus;
  /**
   * Hidden outright, wherever it would otherwise be drawn — including the
   * operator's own arranging surface.
   *
   * Deliberately separate from `status`, because the two answer different
   * questions. `status` is "should the room see this", a decision about the
   * service. `hidden` is the layers-panel eye: "draw this or don't", a decision
   * about the work in front of you. An operator stacking four elements needs to
   * take one out of the way to reach what is under it without also announcing a
   * change to the broadcast, and an element that is on air needs a way to be
   * blanked instantly that leaves its place in the running order intact.
   */
  hidden: boolean;
  /** What the controls call it, captured at add time so the list reads well. */
  label: string;
}

/**
 * An overlay showing something from the library. `kind` is the app's own
 * ContentKind, so useDeck resolves the content for free and a passage, a
 * manuscript, a picture and a clip all travel the same path.
 */
export interface ContentOverlay extends StreamOverlayBase {
  kind: ContentKind;
  /** Id of the passage, manuscript or media item being shown. */
  contentId: string;
  /** Which slide of it, for the multi-slide kinds. */
  slideIndex: number;
  /** Paint the content's own background, rather than floating it on the camera. */
  opaque: boolean;
}

export interface MarqueeOverlay extends StreamOverlayBase {
  kind: "marquee";
  text: string;
  /** Seconds for one full pass. Lower is faster. */
  durationSeconds: number;
}

export type StreamOverlay = ContentOverlay | MarqueeOverlay;

export const isMarquee = (overlay: StreamOverlay): overlay is MarqueeOverlay =>
  overlay.kind === "marquee";

export const isContentOverlay = (
  overlay: StreamOverlay,
): overlay is ContentOverlay => overlay.kind !== "marquee";

/**
 * Whether a kind names a media-library file rather than a slide document. The
 * two resolve completely differently — a file is shown as itself, a document is
 * paged through — so this is the fork both the renderer and the settings use.
 */
export const isMediaKind = (kind: StreamOverlayKind): kind is MediaKind =>
  kind === "image" || kind === "video";

/**
 * Whether a broadcast output should paint this overlay. Both switches have to
 * agree: it has been put on air, and it has not been hidden.
 */
export const isOnAir = (overlay: StreamOverlay): boolean =>
  overlay.status === "live" && !overlay.hidden;

/**
 * Whether any surface should paint it at all. The operator's arranging surface
 * draws staged elements too, so this is the check it uses instead of isOnAir.
 */
export const isVisible = (overlay: StreamOverlay): boolean => !overlay.hidden;

/** What an element is doing right now, as one value the controls can label. */
export type OverlayVisibility = "hidden" | "live" | "draft";

export const overlayVisibility = (
  overlay: StreamOverlay,
): OverlayVisibility => {
  if (overlay.hidden) return "hidden";
  return overlay.status === "live" ? "live" : "draft";
};

export const DEFAULT_OVERLAY_OPACITY = 100;
export const DEFAULT_OVERLAY_RADIUS = 1.4;
export const DEFAULT_MARQUEE_SECONDS = 18;
export const MIN_MARQUEE_SECONDS = 4;
export const MAX_MARQUEE_SECONDS = 90;

/**
 * Where each kind lands when first added, chosen so the common use of each is
 * right without touching a handle: words go in the lower third where a camera
 * frames faces above them, a logo sits in a top corner, a clip parks
 * bottom-right out of the way, and an announcement is a full-width band along
 * the bottom edge.
 */
const DEFAULT_FRAMES: Record<StreamOverlayKind, SlideFrame> = {
  scripture: { x: 6, y: 58, width: 88, height: 34 },
  manuscript: { x: 6, y: 58, width: 88, height: 34 },
  image: { x: 70, y: 6, width: 24, height: 18 },
  video: { x: 64, y: 58, width: 32, height: 24 },
  marquee: { x: 0, y: 88, width: 100, height: 10 },
};

export const defaultFrameFor = (kind: StreamOverlayKind): SlideFrame =>
  clampFrame(DEFAULT_FRAMES[kind]);

const base = (kind: StreamOverlayKind, label: string): StreamOverlayBase => ({
  id: uid(),
  frame: defaultFrameFor(kind),
  opacity: DEFAULT_OVERLAY_OPACITY,
  radius: DEFAULT_OVERLAY_RADIUS,
  // Always a draft. Nothing an operator adds appears on the broadcast until
  // they say so; see OverlayStatus.
  status: "draft",
  hidden: false,
  label,
});

export function createContentOverlay(
  kind: ContentKind,
  contentId: string,
  label: string,
): ContentOverlay {
  return {
    ...base(kind, label),
    kind,
    contentId,
    slideIndex: 0,
    // Words need their backing to stay legible over a moving camera; a picture
    // or clip is the content itself and looks pasted-on with a panel behind it.
    opaque: kind === "scripture" || kind === "manuscript",
  };
}

export function createMarqueeOverlay(text: string): MarqueeOverlay {
  return {
    ...base("marquee", "Announcement"),
    kind: "marquee",
    text,
    durationSeconds: DEFAULT_MARQUEE_SECONDS,
  };
}

/** Moves one overlay through the paint order, clamped to the ends of the list. */
export function reorderOverlays(
  overlays: StreamOverlay[],
  id: string,
  direction: number,
): StreamOverlay[] {
  const from = overlays.findIndex((overlay) => overlay.id === id);
  if (from === -1) return overlays;
  const to = from + direction;
  if (to < 0 || to >= overlays.length) return overlays;
  const next = [...overlays];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
