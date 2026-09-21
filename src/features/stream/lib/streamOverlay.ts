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

export type StreamOverlayKind = ContentKind | "marquee";

export type OverlayStatus = "draft" | "live";

export type OverlayTextLayout = "block" | "slide";

export interface OverlayVideoPlayback {
  playing: boolean;
  muted: boolean;
  volume: number;
  rate: number;
  loop: boolean;
  seekTime: number;
  seekToken: number;
}

interface StreamOverlayBase {
  id: string;
  /** The saved overlay this one keeps in step with, once it has been saved. */
  presetId?: string;
  frame: SlideFrame;
  opacity: number;
  radius: number;
  status: OverlayStatus;
  hidden: boolean;
  label: string;
  autoSync: boolean;
  pending: OverlayEdit | null;
}

export interface ContentOverlay extends StreamOverlayBase {
  kind: ContentKind;
  contentId: string;
  source: SlideMediaSource;
  slideIndex: number;
  opaque: boolean;
  layout: OverlayTextLayout;
  block: OverlayBlockStyle;
  badge: OverlayBadgeStyle;
  animation: AnimationKind;
  video: OverlayVideoPlayback;
}

export interface MarqueeOverlay extends StreamOverlayBase {
  kind: "marquee";
  text: string;
  crossSeconds: number;
  style: OverlaySurfaceStyle;
  fontScale: number;
}

export type StreamOverlay = ContentOverlay | MarqueeOverlay;

type OverlayEditableFields = Omit<ContentOverlay, "id" | "kind" | "pending"> &
  Omit<MarqueeOverlay, "id" | "kind" | "pending">;

export type OverlayEdit = Partial<OverlayEditableFields>;

export const isMarquee = (overlay: StreamOverlay): overlay is MarqueeOverlay =>
  overlay.kind === "marquee";

export const isContentOverlay = (
  overlay: StreamOverlay,
): overlay is ContentOverlay => overlay.kind !== "marquee";

export const isMediaKind = (kind: StreamOverlayKind): kind is MediaKind =>
  kind === "image" || kind === "video";

export const isVideoOverlay = (
  overlay: StreamOverlay,
): overlay is ContentOverlay =>
  isContentOverlay(overlay) && overlay.kind === "video";

export const isOnAir = (overlay: StreamOverlay): boolean =>
  overlay.status === "live" && !overlay.hidden;

export const isVisible = (overlay: StreamOverlay): boolean => !overlay.hidden;

export const hasStagedEdits = (overlay: StreamOverlay): boolean =>
  overlay.pending !== null && Object.keys(overlay.pending).length > 0;

export const editedOverlay = (overlay: StreamOverlay): StreamOverlay =>
  hasStagedEdits(overlay)
    ? ({ ...overlay, ...overlay.pending, pending: null } as StreamOverlay)
    : overlay;

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
  status: "draft",
  hidden: false,
  label,
  autoSync,
  pending: null,
});

export const createContentOverlay = (
  kind: ContentKind,
  contentId: string,
  label: string,
  source: SlideMediaSource = "media",
): ContentOverlay => {
  return {
    ...base(kind, label, kind === "video"),
    kind,
    contentId,
    source,
    slideIndex: 0,
    opaque: kind === "scripture" || kind === "manuscript",
    layout: "block",
    block: { ...DEFAULT_OVERLAY_BLOCK_STYLE },
    badge: { ...DEFAULT_OVERLAY_BADGE_STYLE },
    animation: "fade",
    video: { ...DEFAULT_OVERLAY_VIDEO_PLAYBACK },
  };
};

export const createMarqueeOverlay = (text: string): MarqueeOverlay => {
  return {
    ...base("marquee", "Announcement", false),
    kind: "marquee",
    text,
    crossSeconds: DEFAULT_MARQUEE_CROSS_SECONDS,
    style: { ...DEFAULT_OVERLAY_MARQUEE_STYLE },
    fontScale: DEFAULT_MARQUEE_FONT_SCALE,
  };
};
