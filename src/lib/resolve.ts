import type {
  AnimationKind,
  Background,
  ImageSettings,
  ResolvedStyle,
  Slide,
  SlideDeckDoc,
  TextStyle,
  Theme,
} from "../types";
import { BACKGROUNDS } from "../data/backgrounds";
import { backgroundImageSettings, isImageBackground } from "./media";

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

export interface ResolvedBackground {
  background: Background;
  image: ImageSettings | null;
}

export const resolveBackgroundView = (
  slide: Slide | undefined,
  doc: SlideDeckDoc | undefined,
  theme: Theme,
  bgMap: Record<string, Background>,
): ResolvedBackground => {
  const background = resolveBackground(slide, doc, theme, bgMap);
  return { background, image: resolveBackgroundImage(slide, doc, background) };
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

export const resolveAudioId = (
  slide: Slide | undefined,
  doc: SlideDeckDoc | undefined,
  theme?: Theme,
): string | null => {
  return (
    slide?.overrides?.audioId ||
    doc?.defaultAudioId ||
    theme?.defaultAudioId ||
    null
  );
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
