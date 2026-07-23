import type {
  AnimationKind,
  Background,
  ResolvedStyle,
  Slide,
  SlideDeckDoc,
  Theme,
} from "../types";
import { BACKGROUNDS } from "../data/backgrounds";

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

function applyTextStyle(
  target: ResolvedStyle,
  source: Record<string, unknown> | undefined,
): void {
  if (!source) return;
  for (const key of TEXT_KEYS) {
    const value = source[key];
    if (value != null && value !== "") {
      (target as unknown as Record<string, unknown>)[key] = value;
    }
  }
}

/** Merge theme defaults, then doc-level style, then per-slide overrides. */
export function resolveStyle(
  slide: Slide | undefined,
  doc: SlideDeckDoc | undefined,
  theme: Theme,
): ResolvedStyle {
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
}

/** Same as `resolveStyle`, with a single line's own override layered on top. */
export function resolveLineStyle(
  slide: Slide | undefined,
  lineIndex: number,
  doc: SlideDeckDoc | undefined,
  theme: Theme,
): ResolvedStyle {
  const style = resolveStyle(slide, doc, theme);
  applyTextStyle(
    style,
    slide?.lineOverrides?.[lineIndex] as Record<string, unknown> | undefined,
  );
  return style;
}

export function resolveBackgroundId(
  slide: Slide | undefined,
  doc: SlideDeckDoc | undefined,
  theme: Theme,
): string {
  return (
    slide?.overrides?.backgroundId ||
    doc?.defaultBackgroundId ||
    theme.backgroundId
  );
}

export function resolveBackground(
  slide: Slide | undefined,
  doc: SlideDeckDoc | undefined,
  theme: Theme,
  bgMap: Record<string, Background>,
): Background {
  const id = resolveBackgroundId(slide, doc, theme);
  return bgMap[id] || bgMap[theme.backgroundId] || BACKGROUNDS[0];
}

export function resolveAnimation(
  slide: Slide | undefined,
  doc: SlideDeckDoc | undefined,
  theme: Theme,
  fallback: AnimationKind,
): AnimationKind {
  return (
    slide?.overrides?.animation || doc?.animation || theme.animation || fallback
  );
}

export function resolveAudioId(
  slide: Slide | undefined,
  doc: SlideDeckDoc | undefined,
  theme?: Theme,
): string | null {
  return (
    slide?.overrides?.audioId ||
    doc?.defaultAudioId ||
    theme?.defaultAudioId ||
    null
  );
}

export function resolveAutoPlay(
  doc: SlideDeckDoc | undefined,
  theme?: Theme,
): boolean {
  return doc?.autoPlay ?? theme?.autoPlay ?? false;
}

export function resolveSlideDuration(
  doc: SlideDeckDoc | undefined,
  theme?: Theme,
): number {
  return doc?.slideDurationSeconds ?? theme?.slideDurationSeconds ?? 15;
}
