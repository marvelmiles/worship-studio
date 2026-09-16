import type {
  Background,
  ImageSettings,
  MediaItem,
  MediaKind,
  SlideFrame,
  SlideMedia,
  SlideMediaSource,
  VideoSettings,
} from "../types";
import { uid } from "./id";
import {
  backgroundImageSettings,
  DEFAULT_IMAGE_SETTINGS,
  DEFAULT_VIDEO_SETTINGS,
  imageSettingsOf,
  videoSettingsOf,
} from "./media";

export const SLIDE_ASPECT = 16 / 9;

export const DEFAULT_SLIDE_MEDIA_RADIUS = 1.4;
export const DEFAULT_SLIDE_MEDIA_OPACITY = 100;

export const MIN_FRAME_SIZE = 6;
const MIN_ON_SLIDE = 5;
const DEFAULT_WIDTH = 38;
const MAX_DEFAULT_HEIGHT = 74;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const round = (value: number): number => Math.round(value * 100) / 100;

interface Dimensions {
  width?: number;
  height?: number;
}

export interface SlideMediaChoice extends Dimensions {
  source: SlideMediaSource;
  id: string;
  kind: MediaKind;
  name: string;
  duration?: number;
  image?: ImageSettings;
  video?: VideoSettings;
}

export const mediaItemChoice = (item: MediaItem): SlideMediaChoice => ({
  source: "media",
  id: item.id,
  kind: item.kind,
  name: item.name,
  width: item.width,
  height: item.height,
  duration: item.duration,
  image: item.kind === "image" ? imageSettingsOf(item) : undefined,
  video: item.kind === "video" ? videoSettingsOf(item) : undefined,
});

export const backgroundChoice = (background: Background): SlideMediaChoice => ({
  source: "background",
  id: background.id,
  kind: "image",
  name: background.name,
  image: backgroundImageSettings(background),
});

const ratioOf = (size?: Dimensions): number =>
  size?.width && size?.height ? size.width / size.height : SLIDE_ASPECT;

export const frameForItem = (size?: Dimensions): SlideFrame => {
  const width = DEFAULT_WIDTH;
  const height = clamp(
    (width / ratioOf(size)) * SLIDE_ASPECT,
    MIN_FRAME_SIZE,
    MAX_DEFAULT_HEIGHT,
  );
  return {
    x: round((100 - width) / 2),
    y: round((100 - height) / 2),
    width: round(width),
    height: round(height),
  };
};

export const clampFrame = (frame: SlideFrame): SlideFrame => {
  const width = clamp(frame.width, MIN_FRAME_SIZE, 100);
  const height = clamp(frame.height, MIN_FRAME_SIZE, 100);
  return {
    width: round(width),
    height: round(height),
    x: round(clamp(frame.x, MIN_ON_SLIDE - width, 100 - MIN_ON_SLIDE)),
    y: round(clamp(frame.y, MIN_ON_SLIDE - height, 100 - MIN_ON_SLIDE)),
  };
};

export const slideImageSettings = (base?: ImageSettings): ImageSettings => ({
  ...(base ?? DEFAULT_IMAGE_SETTINGS),
  fit: "cover",
  scrim: false,
});

export const slideVideoSettings = (base?: VideoSettings): VideoSettings => ({
  ...(base ?? DEFAULT_VIDEO_SETTINGS),
  fit: "cover",
  loop: true,
});

export const createSlideMedia = (choice: SlideMediaChoice): SlideMedia => {
  return {
    id: uid(),
    kind: choice.kind,
    mediaId: choice.id,
    source: choice.source,
    frame: frameForItem(choice),
    radius: DEFAULT_SLIDE_MEDIA_RADIUS,
    opacity: DEFAULT_SLIDE_MEDIA_OPACITY,
    image:
      choice.kind === "image" ? slideImageSettings(choice.image) : undefined,
    video:
      choice.kind === "video" ? slideVideoSettings(choice.video) : undefined,
  };
};

export const placedMediaSource = (media: SlideMedia): SlideMediaSource =>
  media.source ?? "media";

export const placedImageSettings = (media: SlideMedia): ImageSettings =>
  media.image ?? slideImageSettings();

export const placedVideoSettings = (media: SlideMedia): VideoSettings =>
  media.video ?? slideVideoSettings();

export interface ImportedSlideMedia {
  id?: string;
  kind: MediaKind;
  mediaId: string;
  source?: SlideMediaSource;
  frame?: Partial<SlideFrame>;
  radius?: number;
  opacity?: number;
  image?: Partial<ImageSettings>;
  video?: Partial<VideoSettings>;
}

export const normalizeSlideMedia = (raw: ImportedSlideMedia): SlideMedia => {
  return {
    id: raw.id || uid(),
    kind: raw.kind,
    mediaId: raw.mediaId,
    source: raw.source ?? "media",
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
};
