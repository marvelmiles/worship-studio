import type {
  AnimationKind,
  ContentKind,
  MediaKind,
  SlideFrame,
  SlideMediaSource,
} from "../../../types";
import { uid } from "../../../lib/id";
import { clampFrame } from "../../../lib/slideMedia";
import {
  DEFAULT_OVERLAY_BADGE_STYLE,
  DEFAULT_OVERLAY_BLOCK_STYLE,
  DEFAULT_OVERLAY_MARQUEE_STYLE,
  type OverlayBadgeStyle,
  type OverlayBlockStyle,
  type OverlaySurfaceStyle,
} from "./overlayAppearance";

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

/**
 * How a passage or manuscript is laid out inside its box.
 *
 * "block" is the broadcast layout: a padded panel with a badge above the words,
 * sized so the text always fits with clear space around it. "slide" renders the
 * library slide exactly as the projector would, for the rarer case where the
 * document's own theme and background are the point.
 */
export type OverlayTextLayout = "block" | "slide";

/** Operator-driven playback for an overlay clip. */
export interface OverlayVideoPlayback {
  playing: boolean;
  muted: boolean;
  /** 0-100. */
  volume: number;
  /** Playback rate multiplier. */
  rate: number;
  loop: boolean;
  /** Target time in seconds, applied when `seekToken` changes. */
  seekTime: number;
  seekToken: number;
}

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
  /**
   * Send every edit straight to the broadcast while this is on air.
   *
   * Off by default, because most edits to something the room is already looking
   * at are made in several steps — drag it, size it, recolour it — and the room
   * should be shown the result, not the working. Clips are the exception (see
   * createContentOverlay): pausing or seeking one is the result.
   */
  autoSync: boolean;
  /**
   * Edits made to a live overlay that have not been put on air yet.
   *
   * The operator's own surfaces draw the overlay with these applied, so what is
   * being arranged is visible; every broadcast output draws the overlay without
   * them, so the room keeps seeing the last applied version until "Apply now".
   * Null whenever there is nothing staged, which is the normal state.
   */
  pending: OverlayEdit | null;
}

/**
 * An overlay showing something from the library. `kind` is the app's own
 * ContentKind, so a passage, a manuscript, a picture and a clip all travel the
 * same path.
 */
export interface ContentOverlay extends StreamOverlayBase {
  kind: ContentKind;
  /** Id of the passage, manuscript or media item being shown. */
  contentId: string;
  /**
   * Which library holds a picture: the media module, or the asset library's
   * picture backgrounds. Documents are always their own library's, so this is
   * only read for the media kinds.
   */
  source: SlideMediaSource;
  /** Which block (block layout) or slide (slide layout) of it is showing. */
  slideIndex: number;
  /** Slide layout only: paint the slide's own background behind the words. */
  opaque: boolean;
  /** Text kinds only. */
  layout: OverlayTextLayout;
  /** Text kinds only: the panel the words are laid out in. */
  block: OverlayBlockStyle;
  /** Text kinds only: the reference or section label above the words. */
  badge: OverlayBadgeStyle;
  /** Text kinds only: how one block gives way to the next. */
  animation: AnimationKind;
  /** Video only. */
  video: OverlayVideoPlayback;
}

export interface MarqueeOverlay extends StreamOverlayBase {
  kind: "marquee";
  text: string;
  /**
   * Seconds a word takes to cross the band, so the announcement travels at the
   * speed the operator set whatever its length. Lower is faster.
   */
  crossSeconds: number;
  style: OverlaySurfaceStyle;
  /** Percent of the band's height, so taller bands carry bigger words. */
  fontScale: number;
}

export type StreamOverlay = ContentOverlay | MarqueeOverlay;

/**
 * Everything about an overlay an operator can change from the controls, as a
 * patch. Identity and kind are excluded because they are what the patch is
 * applied to, and `pending` because a staged edit cannot itself be staged.
 */
type OverlayEditableFields = Omit<ContentOverlay, "id" | "kind" | "pending"> &
  Omit<MarqueeOverlay, "id" | "kind" | "pending">;

export type OverlayEdit = Partial<OverlayEditableFields>;

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

export const isVideoOverlay = (
  overlay: StreamOverlay,
): overlay is ContentOverlay =>
  isContentOverlay(overlay) && overlay.kind === "video";

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

export const hasStagedEdits = (overlay: StreamOverlay): boolean =>
  overlay.pending !== null && Object.keys(overlay.pending).length > 0;

/**
 * The overlay as the operator is arranging it: what is on air, plus whatever
 * they have changed since. Broadcast outputs never call this, which is the
 * whole point of the split.
 */
export const editedOverlay = (overlay: StreamOverlay): StreamOverlay =>
  hasStagedEdits(overlay)
    ? ({ ...overlay, ...overlay.pending, pending: null } as StreamOverlay)
    : overlay;

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
export const DEFAULT_MARQUEE_CROSS_SECONDS = 7;
export const MIN_MARQUEE_CROSS_SECONDS = 2;
export const MAX_MARQUEE_CROSS_SECONDS = 24;
export const DEFAULT_MARQUEE_FONT_SCALE = 52;

export const DEFAULT_OVERLAY_VIDEO_PLAYBACK: OverlayVideoPlayback = {
  playing: true,
  muted: false,
  volume: 100,
  rate: 1,
  loop: true,
  seekTime: 0,
  seekToken: 0,
};

/**
 * Where each kind lands when first added, chosen so the common use of each is
 * right without touching a handle: words go in the lower third where a camera
 * frames faces above them, a logo sits in a top corner, a clip parks
 * bottom-right out of the way, and an announcement is a full-width band along
 * the bottom edge.
 *
 * A passage or manuscript starts at the minimum height its panel needs rather
 * than as a tall box: the words are split across as many blocks as it takes to
 * fit (see useOverlayBlocks), so a short frame reads as a caption band under
 * the camera instead of a wall of text over it.
 */
const DEFAULT_FRAMES: Record<StreamOverlayKind, SlideFrame> = {
  scripture: { x: 8, y: 63, width: 84, height: 22 },
  manuscript: { x: 8, y: 63, width: 84, height: 22 },
  image: { x: 70, y: 6, width: 24, height: 18 },
  video: { x: 64, y: 58, width: 32, height: 24 },
  marquee: { x: 0, y: 88, width: 100, height: 10 },
};

export const defaultFrameFor = (kind: StreamOverlayKind): SlideFrame =>
  clampFrame(DEFAULT_FRAMES[kind]);

const base = (
  kind: StreamOverlayKind,
  label: string,
  autoSync: boolean,
): StreamOverlayBase => ({
  id: uid(),
  frame: defaultFrameFor(kind),
  opacity: DEFAULT_OVERLAY_OPACITY,
  radius: DEFAULT_OVERLAY_RADIUS,
  // Always a draft. Nothing an operator adds appears on the broadcast until
  // they say so; see OverlayStatus.
  status: "draft",
  hidden: false,
  label,
  autoSync,
  pending: null,
});

export function createContentOverlay(
  kind: ContentKind,
  contentId: string,
  label: string,
  source: SlideMediaSource = "media",
): ContentOverlay {
  return {
    // A clip's controls are the performance: pausing, seeking or turning one
    // down is meant to happen on the broadcast as it is pressed, not to be
    // staged and applied afterwards.
    ...base(kind, label, kind === "video"),
    kind,
    contentId,
    source,
    slideIndex: 0,
    // Words need their backing to stay legible over a moving camera; a picture
    // or clip is the content itself and looks pasted-on with a panel behind it.
    opaque: kind === "scripture" || kind === "manuscript",
    layout: "block",
    block: { ...DEFAULT_OVERLAY_BLOCK_STYLE },
    badge: { ...DEFAULT_OVERLAY_BADGE_STYLE },
    animation: "fade",
    video: { ...DEFAULT_OVERLAY_VIDEO_PLAYBACK },
  };
}

export function createMarqueeOverlay(text: string): MarqueeOverlay {
  return {
    ...base("marquee", "Announcement", false),
    kind: "marquee",
    text,
    crossSeconds: DEFAULT_MARQUEE_CROSS_SECONDS,
    style: { ...DEFAULT_OVERLAY_MARQUEE_STYLE },
    fontScale: DEFAULT_MARQUEE_FONT_SCALE,
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
