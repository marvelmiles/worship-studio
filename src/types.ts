export type Align = "left" | "center" | "right";

export type AnimationKind =
  | "fade"
  | "crossfade"
  | "dissolve"
  | "zoom"
  | "slide-left"
  | "slide-right"
  | "slide-up"
  | "slide-down";

export type EasingKind = "ease" | "ease-in-out" | "ease-out" | "linear";

export type PresentationView = "normal" | "cover" | "fill";

export type BgType = "gradient" | "solid" | "image";

/** Text appearance shared by themes, songs and slides. */
export interface TextStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  align?: Align;
  color?: string;
  lineHeight?: number;
  letterSpacing?: number;
  uppercase?: boolean;
  textShadow?: string;
}

export interface SlideOverrides extends TextStyle {
  backgroundId?: string;
  audioId?: string;
  animation?: AnimationKind;
  scrim?: boolean;
}

export interface Slide {
  id: string;
  type: string;
  label: string;
  lines: string[];
  overrides: SlideOverrides;
  /** Per-line style overrides, keyed by line index. Layered on top of `overrides`. */
  lineOverrides?: Record<number, TextStyle>;
  notes: string;
}

/** Song-level appearance overrides (no slide-only keys). */
export type SongStyle = TextStyle;

export interface Song {
  id: string;
  title: string;
  artist?: string;
  category?: string;
  lyrics: string;
  slides: Slide[];
  maxLines?: number;
  defaultThemeId: string;
  defaultBackgroundId?: string;
  defaultAudioId?: string | null;
  animation?: AnimationKind;
  autoPlay?: boolean;
  slideDurationSeconds?: number;
  shortcutMode?: "all-slides" | "first-slide-per-tag";
  style?: SongStyle;
  createdAt: string;
  updatedAt: string;
  deleted?: boolean;
  builtIn?: boolean;
}

export interface Theme {
  id: string;
  name: string;
  builtIn?: boolean;
  fontFamily: string;
  fontWeight: number;
  color: string;
  align: Align;
  lineHeight: number;
  letterSpacing: number;
  fontSize: number;
  uppercase: boolean;
  textShadow: string;
  backgroundId: string;
  animation?: AnimationKind;
  autoPlay?: boolean;
  slideDurationSeconds?: number;
  defaultAudioId?: string | null;
}

export interface Background {
  id: string;
  name: string;
  category: string;
  type: BgType;
  css?: string;
  color?: string;
  dataUrl?: string;
  light?: boolean;
  builtIn?: boolean;
}

export interface AudioItem {
  id: string;
  name: string;
  dataUrl: string;
  builtIn?: boolean;
}

export interface Prefs {
  id: string;
  transition: AnimationKind;
  transitionDuration: number;
  easing: EasingKind;
  backgroundVolume: number;
  loopAudio: boolean;
  showPresenterBar: boolean;
  presentationView: PresentationView;
  autoHideControls: boolean;
  autoHidePresenterBar: boolean;
  onboarded: boolean;
}

/** Fully-resolved text style with every field present. */
export interface ResolvedStyle {
  fontFamily: string;
  fontWeight: number;
  color: string;
  align: Align;
  lineHeight: number;
  letterSpacing: number;
  fontSize: number;
  uppercase: boolean;
  textShadow: string;
}

export type ImportMode = "override" | "merge-imported" | "merge-existing";

export interface Toast {
  id: string;
  message: string;
  kind: "success" | "error";
}

export interface AppAlert {
  id: string;
  message: string;
  kind: "warning" | "error" | "info";
  key?: string;
}
