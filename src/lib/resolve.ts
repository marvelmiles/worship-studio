import type {
  AnimationKind,
  AudioItem,
  AudioSettings,
  Background,
  ImageSettings,
  MediaItem,
  ResolvedStyle,
  Slide,
  SlideDeckDoc,
  TextStyle,
  Theme,
  VideoSettings,
} from "../types";
import { BACKGROUNDS } from "../data/backgrounds";
import {
  NO_AUDIO_ID,
  audioSettingsOf,
  backgroundImageSettings,
  backgroundVideoSettings,
  isImageBackground,
  isVideoBackground,
} from "./media";

const TEXT_KEYS = [
  "fontFamily",
  "fontWeight",
  "color",
  "align",
  "lineHeight",
  "letterSpacing",
  "fontSize",
  "uppercase",
  "textShadow",
] as const;

const applyTextStyle = (
  target: ResolvedStyle,
  source: Record<string, unknown> | undefined,
): void => {
  if (!source) return;
  for (const key of TEXT_KEYS) {
    const value = source[key];
    if (value != null && value !== "") {
      (target as unknown as Record<string, unknown>)[key] = value;
    }
  }
};

export const layerTextStyle = (
  base: ResolvedStyle,
  ...styles: (TextStyle | undefined)[]
): ResolvedStyle => {
  const style = { ...base };
  for (const layer of styles)
    applyTextStyle(style, layer as Record<string, unknown> | undefined);
  return style;
};

export const resolveStyle = (
  slide: Slide | undefined,
  doc: SlideDeckDoc | undefined,
  theme: Theme,
): ResolvedStyle => {
  const style: ResolvedStyle = {
    fontFamily: theme.fontFamily,
    fontWeight: theme.fontWeight,
    color: theme.color,
    align: theme.align,
    lineHeight: theme.lineHeight,
    letterSpacing: theme.letterSpacing,
    fontSize: theme.fontSize,
    uppercase: theme.uppercase,
    textShadow: theme.textShadow,
  };
  applyTextStyle(style, doc?.style as Record<string, unknown> | undefined);
  applyTextStyle(
    style,
    slide?.overrides as Record<string, unknown> | undefined,
  );
  return style;
};

export const resolveLineStyle = (
  slide: Slide | undefined,
  lineIndex: number,
  doc: SlideDeckDoc | undefined,
  theme: Theme,
): ResolvedStyle => {
  const style = resolveStyle(slide, doc, theme);
  applyTextStyle(
    style,
    slide?.lineOverrides?.[lineIndex] as Record<string, unknown> | undefined,
  );
  return style;
};

export const resolveBackgroundId = (
  slide: Slide | undefined,
  doc: SlideDeckDoc | undefined,
  theme: Theme,
): string => {
  return (
    slide?.overrides?.backgroundId ||
    doc?.defaultBackgroundId ||
    theme.backgroundId
  );
};

export const resolveBackground = (
  slide: Slide | undefined,
  doc: SlideDeckDoc | undefined,
  theme: Theme,
  bgMap: Record<string, Background>,
): Background => {
  const id = resolveBackgroundId(slide, doc, theme);
  return bgMap[id] || bgMap[theme.backgroundId] || BACKGROUNDS[0];
};

export const resolveBackgroundImage = (
  slide: Slide | undefined,
  doc: SlideDeckDoc | undefined,
  background: Background,
): ImageSettings | null => {
  if (!isImageBackground(background)) return null;
  let settings = backgroundImageSettings(background);

  const docBackgroundId = doc?.defaultBackgroundId;
  if (
    doc?.defaultBackgroundImage &&
    (!docBackgroundId || docBackgroundId === background.id)
  )
    settings = { ...settings, ...doc.defaultBackgroundImage };

  const slideBackgroundId = slide?.overrides?.backgroundId;
  if (!slideBackgroundId || slideBackgroundId === background.id) {
    if (slide?.overrides?.backgroundImage)
      settings = { ...settings, ...slide.overrides.backgroundImage };
  }
  return settings;
};

/**
 * Whether a layer's settings belong to the background in play. A layer that
 * names a different background is styling something else, so its settings are
 * left out rather than bleeding onto the one actually shown.
 */
const appliesToBackground = (
  layerBackgroundId: string | undefined,
  backgroundId: string,
): boolean => !layerBackgroundId || layerBackgroundId === backgroundId;

/**
 * A moving background's settings for this document or slide alone. The clip in
 * the library keeps its own settings; these sit on top of them for one use.
 */
export const resolveBackgroundVideo = (
  slide: Slide | undefined,
  doc: SlideDeckDoc | undefined,
  background: Background,
  item?: MediaItem,
): VideoSettings | null => {
  if (!isVideoBackground(background)) return null;
  let settings = backgroundVideoSettings(item);

  if (
    doc?.defaultBackgroundVideo &&
    appliesToBackground(doc.defaultBackgroundId, background.id)
  )
    settings = { ...settings, ...doc.defaultBackgroundVideo };

  if (
    slide?.overrides?.backgroundVideo &&
    appliesToBackground(slide.overrides.backgroundId, background.id)
  )
    settings = { ...settings, ...slide.overrides.backgroundVideo };

  return settings;
};

export interface ResolvedBackground {
  background: Background;
  image: ImageSettings | null;
  video: VideoSettings | null;
}

export const resolveBackgroundView = (
  slide: Slide | undefined,
  doc: SlideDeckDoc | undefined,
  theme: Theme,
  bgMap: Record<string, Background>,
  videoItem?: MediaItem,
): ResolvedBackground => {
  const background = resolveBackground(slide, doc, theme, bgMap);
  return {
    background,
    image: resolveBackgroundImage(slide, doc, background),
    video: resolveBackgroundVideo(slide, doc, background, videoItem),
  };
};

export const resolveAnimation = (
  slide: Slide | undefined,
  doc: SlideDeckDoc | undefined,
  theme: Theme,
  fallback: AnimationKind,
): AnimationKind => {
  return (
    slide?.overrides?.animation || doc?.animation || theme.animation || fallback
  );
};

/** Silence chosen here is an answer, so it settles the question rather than
 *  passing it on to the document or theme underneath. */
export const resolveAudioId = (
  slide: Slide | undefined,
  doc: SlideDeckDoc | undefined,
  theme?: Theme,
): string | null => {
  const chosen =
    slide?.overrides?.audioId ||
    doc?.defaultAudioId ||
    theme?.defaultAudioId ||
    null;
  return chosen === NO_AUDIO_ID ? null : chosen;
};

/**
 * The background audio's settings for this document or slide alone, layered
 * over whatever the sound carries in the library.
 */
export const resolveAudioSettings = (
  slide: Slide | undefined,
  doc: SlideDeckDoc | undefined,
  item: AudioItem,
): AudioSettings => {
  let settings = audioSettingsOf(item);

  const docAudioId = doc?.defaultAudioId;
  if (doc?.defaultAudioSettings && (!docAudioId || docAudioId === item.id))
    settings = { ...settings, ...doc.defaultAudioSettings };

  const slideAudioId = slide?.overrides?.audioId;
  if (
    slide?.overrides?.audioSettings &&
    (!slideAudioId || slideAudioId === item.id)
  )
    settings = { ...settings, ...slide.overrides.audioSettings };

  return settings;
};

export const resolveAutoPlay = (
  doc: SlideDeckDoc | undefined,
  theme?: Theme,
): boolean => {
  return doc?.autoPlay ?? theme?.autoPlay ?? false;
};

export const resolveSlideDuration = (
  doc: SlideDeckDoc | undefined,
  theme?: Theme,
): number => {
  return doc?.slideDurationSeconds ?? theme?.slideDurationSeconds ?? 15;
};
