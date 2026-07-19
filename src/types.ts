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

/** Every kind of content that can be projected live. */
export type ContentKind = "song" | "scripture" | "image" | "video";

/** Text appearance shared by themes, deck documents and slides. */
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

export type ShortcutMode = "all-slides" | "first-slide-per-tag";

/**
 * Common shape of every document that presents a deck of text slides
 * (songs, scripture passages, and any future slide-based module).
 */
export interface SlideDeckDoc {
  id: string;
  title: string;
  slides: Slide[];
  defaultThemeId: string;
  defaultBackgroundId?: string;
  defaultAudioId?: string | null;
  animation?: AnimationKind;
  autoPlay?: boolean;
  slideDurationSeconds?: number;
  shortcutMode?: ShortcutMode;
  style?: TextStyle;
  createdAt: string;
  updatedAt: string;
  deleted?: boolean;
  builtIn?: boolean;
}

/** Deck-level appearance overrides (no slide-only keys). */
export type SongStyle = TextStyle;

export interface Song extends SlideDeckDoc {
  artist?: string;
  category?: string;
  lyrics: string;
  maxLines?: number;
}

export type BibleVersionId = "KJV" | "ASV";

export interface PassageRange {
  bookId: number;
  bookName: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
}

export interface BibleVerse {
  v: number;
  t: string;
}

export interface ScripturePassage extends SlideDeckDoc {
  version: BibleVersionId;
  range: PassageRange;
  verses: BibleVerse[];
  versesPerSlide: number;
  showVerseNumbers: boolean;
  showReference: boolean;
  /** Ephemeral "present now" passage, hidden from the saved library. */
  quick?: boolean;
}

export type MediaKind = "image" | "video";

export type MediaFit = "contain" | "cover" | "fill";

export interface MediaAdjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  grayscale: number;
  sepia: number;
  blur: number;
}

export interface ImageSettings extends MediaAdjustments {
  rotate: 0 | 90 | 180 | 270;
  flipH: boolean;
  flipV: boolean;
  fit: MediaFit;
  scrim: boolean;
}

export interface VideoSettings extends MediaAdjustments {
  trimStart: number;
  trimEnd: number | null;
  volume: number;
  muted: boolean;
  loop: boolean;
  playbackRate: number;
  fit: MediaFit;
}

/**
 * Metadata only, the binary payload lives in the "files" store under this
 * item's id (thumbnail under `${id}:thumb`) and is fetched on demand.
 */
export interface MediaItem {
  id: string;
  kind: MediaKind;
  name: string;
  mimeType?: string;
  size: number;
  duration?: number;
  width?: number;
  height?: number;
  hasThumb?: boolean;
  image?: ImageSettings;
  video?: VideoSettings;
  createdAt: string;
  updatedAt: string;
  builtIn?: boolean;
}

export interface Theme {
  id: string;
  name: string;
  builtIn?: boolean;
  /** Missing on built-in/legacy themes that were never edited. */
  createdAt?: string;
  updatedAt?: string;
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
  /** Inline data for bundled/legacy image backgrounds only; uploads use `blobId`. */
  dataUrl?: string;
  /** Points into the "files" store; resolved to an object URL on demand. */
  blobId?: string;
  size?: number;
  light?: boolean;
  builtIn?: boolean;
  /** Missing on bundled backgrounds and legacy uploads. */
  createdAt?: string;
}

export interface AudioItem {
  id: string;
  name: string;
  /** Inline data for the bundled default pads only; uploads use `blobId`. */
  dataUrl?: string;
  blobId?: string;
  size?: number;
  builtIn?: boolean;
  /** Missing on the bundled default pads. */
  createdAt?: string;
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
  bibleVersion: BibleVersionId;
  defaultSongThemeId: string;
  defaultScriptureThemeId: string;
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

export interface PresentTarget {
  kind: ContentKind;
  id: string;
  startIndex: number;
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
