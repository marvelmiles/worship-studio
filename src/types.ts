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

export type PipCorner =
  "top-left" | "top-right" | "bottom-left" | "bottom-right";

export interface PipPlacement {
  corner: PipCorner;
  size: number;
}

export type BgType = "gradient" | "solid" | "image" | "video";

export type ContentKind = "manuscript" | "scripture" | "image" | "video";

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
  backgroundImage?: ImageSettings;
}

export interface SlideFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type SlideMediaSource = "media" | "background";

export interface SlideMedia {
  id: string;
  kind: MediaKind;
  mediaId: string;
  source?: SlideMediaSource;
  frame: SlideFrame;
  radius?: number;
  opacity?: number;
  image?: ImageSettings;
  video?: VideoSettings;
}

export type VerticalAlign = "top" | "middle" | "bottom";

export interface SlideTextBox {
  id: string;
  frame: SlideFrame;
  lines: string[];
  verticalAlign?: VerticalAlign;
  style?: TextStyle;
  lineOverrides?: Record<number, TextStyle>;
}

export type SlideElementKind = MediaKind | "text";

export interface Slide {
  id: string;
  type: string;
  label: string;
  lines: string[];
  overrides: SlideOverrides;
  lineOverrides?: Record<number, TextStyle>;
  media?: SlideMedia[];
  textBoxes?: SlideTextBox[];
  notes: string;
}

export type ShortcutMode = "all-slides" | "first-slide-per-tag";

export type LibraryMarkAction = "pinned" | "unpinned" | "kept" | "unkept";

export interface LibraryMark {
  action: LibraryMarkAction;
  at: string;
}

export interface SlideDeckDoc {
  id: string;
  title: string;
  slides: Slide[];
  defaultThemeId: string;
  defaultBackgroundId?: string;
  defaultBackgroundImage?: ImageSettings;
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
  keepOnReset?: boolean;
  pinned?: boolean;
  mark?: LibraryMark;
}

export type ManuscriptFormat = "song" | "sermon";

/** Tune details that ship with a built-in hymn, for the musicians rather than the screen. */
export interface HymnMusic {
  tune?: string;
  composer?: string;
  meter?: string;
  key?: string;
  tempo?: number;
  source?: string;
}

export interface Manuscript extends SlideDeckDoc {
  author?: string;
  collection?: string;
  body: string;
  maxLines?: number;
  format?: ManuscriptFormat;
  music?: HymnMusic;
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
  pinned?: boolean;
  mark?: LibraryMark;
}

export interface Theme {
  id: string;
  name: string;
  builtIn?: boolean;
  keepOnReset?: boolean;
  mark?: LibraryMark;
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
  dataUrl?: string;
  blobId?: string;
  image?: ImageSettings;
  mediaId?: string;
  size?: number;
  light?: boolean;
  builtIn?: boolean;
  createdAt?: string;
}

export interface AudioSettings {
  trimStart: number;
  trimEnd: number | null;
  volume: number;
}

export interface AudioItem {
  id: string;
  name: string;
  dataUrl?: string;
  blobId?: string;
  size?: number;
  duration?: number;
  settings?: AudioSettings;
  mediaId?: string;
  builtIn?: boolean;
  createdAt?: string;
  updatedAt?: string;
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
  defaultManuscriptThemeId: string;
  defaultScriptureThemeId: string;
  onboarded: boolean;
  goLiveTipDismissed: boolean;
  /** Which build of the bundled hymnal is installed; 0 means none yet. */
  hymnalVersion: number;
}

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
