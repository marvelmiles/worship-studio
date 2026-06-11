import type {
  AnimationKind,
  Background,
  ResolvedStyle,
  Slide,
  Song,
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

function applyTextStyle(target: ResolvedStyle, source: Record<string, unknown> | undefined): void {
  if (!source) return;
  for (const key of TEXT_KEYS) {
    const value = source[key];
    if (value != null && value !== "") {
      (target as unknown as Record<string, unknown>)[key] = value;
    }
  }
}

/** Merge theme defaults, then song-level style, then per-slide overrides. */
export function resolveStyle(
  slide: Slide | undefined,
  song: Song | undefined,
  theme: Theme
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
  applyTextStyle(style, song?.style as Record<string, unknown> | undefined);
  applyTextStyle(style, slide?.overrides as Record<string, unknown> | undefined);
  return style;
}

export function resolveBackgroundId(
  slide: Slide | undefined,
  song: Song | undefined,
  theme: Theme
): string {
  return slide?.overrides?.backgroundId || song?.defaultBackgroundId || theme.backgroundId;
}

export function resolveBackground(
  slide: Slide | undefined,
  song: Song | undefined,
  theme: Theme,
  bgMap: Record<string, Background>
): Background {
  const id = resolveBackgroundId(slide, song, theme);
  return bgMap[id] || bgMap[theme.backgroundId] || BACKGROUNDS[0];
}

export function resolveAnimation(
  slide: Slide | undefined,
  song: Song | undefined,
  theme: Theme,
  fallback: AnimationKind
): AnimationKind {
  return slide?.overrides?.animation || song?.animation || theme.animation || fallback;
}

export function resolveAudioId(
  slide: Slide | undefined,
  song: Song | undefined,
  theme?: Theme
): string | null {
  return slide?.overrides?.audioId || song?.defaultAudioId || theme?.defaultAudioId || null;
}

export function resolveAutoPlay(song: Song | undefined, theme?: Theme): boolean {
  return song?.autoPlay ?? theme?.autoPlay ?? false;
}

export function resolveSlideDuration(song: Song | undefined, theme?: Theme): number {
  return song?.slideDurationSeconds ?? theme?.slideDurationSeconds ?? 15;
}
