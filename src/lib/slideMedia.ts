import type {
  ImageSettings,
  MediaItem,
  MediaKind,
  SlideMedia,
  SlideMediaFrame,
  VideoSettings,
} from "../types";
import { uid } from "./id";
import {
  DEFAULT_IMAGE_SETTINGS,
  DEFAULT_VIDEO_SETTINGS,
  imageSettingsOf,
  videoSettingsOf,
} from "./media";

/**
 * Placement maths for pictures and clips dropped onto a slide. Frames are held
 * in percentages of the slide box, so one placement is correct at every size the
 * slide is painted at, and the same numbers drive the editor's drag handles and
 * the projector.
 */

/** Slides are laid out 16:9; converting a width to a height needs the ratio. */
export const SLIDE_ASPECT = 16 / 9;

export const DEFAULT_SLIDE_MEDIA_RADIUS = 1.4;
export const DEFAULT_SLIDE_MEDIA_OPACITY = 100;

/** Smallest a placed item may be dragged down to, in percent. */
export const MIN_FRAME_SIZE = 6;
/** How much of the item must stay on the slide, in percent. */
const MIN_ON_SLIDE = 5;
const DEFAULT_WIDTH = 38;
const MAX_DEFAULT_HEIGHT = 74;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const round = (value: number): number => Math.round(value * 100) / 100;

/** Aspect ratio of the file itself, falling back to the slide's own. */
const ratioOf = (item?: MediaItem): number =>
  item?.width && item?.height ? item.width / item.height : SLIDE_ASPECT;

/**
 * A first placement that shows the whole picture: centred, a third of the slide
 * wide, and as tall as the file's own proportions ask for.
 */
export function frameForItem(item?: MediaItem): SlideMediaFrame {
  const width = DEFAULT_WIDTH;
  const height = clamp(
    (width / ratioOf(item)) * SLIDE_ASPECT,
    MIN_FRAME_SIZE,
    MAX_DEFAULT_HEIGHT,
  );
  return {
    x: round((100 - width) / 2),
    y: round((100 - height) / 2),
    width: round(width),
    height: round(height),
  };
}

/** Keeps a frame usable: never smaller than a grab target, never dragged away. */
export function clampFrame(frame: SlideMediaFrame): SlideMediaFrame {
  const width = clamp(frame.width, MIN_FRAME_SIZE, 100);
  const height = clamp(frame.height, MIN_FRAME_SIZE, 100);
  return {
    width: round(width),
    height: round(height),
    x: round(clamp(frame.x, MIN_ON_SLIDE - width, 100 - MIN_ON_SLIDE)),
    y: round(clamp(frame.y, MIN_ON_SLIDE - height, 100 - MIN_ON_SLIDE)),
  };
}

/**
 * Picture settings a slide starts a placement from. "cover" is what a placed
 * picture wants: it fills the box the writer drew rather than letterboxing
 * inside it, and the darken overlay belongs to backgrounds, not to a picture
 * sitting on top of the text.
 */
export const slideImageSettings = (item?: MediaItem): ImageSettings => ({
  ...(item ? imageSettingsOf(item) : DEFAULT_IMAGE_SETTINGS),
  fit: "cover",
  scrim: false,
});

/** Clip settings for a placement: it loops, because a slide stays on screen. */
export const slideVideoSettings = (item?: MediaItem): VideoSettings => ({
  ...(item ? videoSettingsOf(item) : DEFAULT_VIDEO_SETTINGS),
  fit: "cover",
  loop: true,
});

export function createSlideMedia(item: MediaItem): SlideMedia {
  return {
    id: uid(),
    kind: item.kind,
    mediaId: item.id,
    frame: frameForItem(item),
    radius: DEFAULT_SLIDE_MEDIA_RADIUS,
    opacity: DEFAULT_SLIDE_MEDIA_OPACITY,
    image: item.kind === "image" ? slideImageSettings(item) : undefined,
    video: item.kind === "video" ? slideVideoSettings(item) : undefined,
  };
}

/** Reads a placement's own settings, falling back to a sane default. */
export const placedImageSettings = (media: SlideMedia): ImageSettings =>
  media.image ?? slideImageSettings();

export const placedVideoSettings = (media: SlideMedia): VideoSettings =>
  media.video ?? slideVideoSettings();

/** A placement as a backup may carry it: anything but the file it points at. */
export interface ImportedSlideMedia {
  id?: string;
  kind: MediaKind;
  mediaId: string;
  frame?: Partial<SlideMediaFrame>;
  radius?: number;
  opacity?: number;
  image?: Partial<ImageSettings>;
  video?: Partial<VideoSettings>;
}

/** Fills in whatever an imported backup left out. */
export function normalizeSlideMedia(raw: ImportedSlideMedia): SlideMedia {
  return {
    id: raw.id || uid(),
    kind: raw.kind,
    mediaId: raw.mediaId,
    frame: clampFrame({ ...frameForItem(), ...raw.frame }),
    radius: raw.radius ?? DEFAULT_SLIDE_MEDIA_RADIUS,
    opacity: raw.opacity ?? DEFAULT_SLIDE_MEDIA_OPACITY,
    image:
      raw.kind === "image"
        ? { ...slideImageSettings(), ...raw.image }
        : undefined,
    video:
      raw.kind === "video"
        ? { ...slideVideoSettings(), ...raw.video }
        : undefined,
  };
}
