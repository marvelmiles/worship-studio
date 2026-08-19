import type {
  Background,
  ImageSettings,
  MediaAdjustments,
  MediaItem,
  VideoSettings,
} from "../types";

export const DEFAULT_ADJUSTMENTS: MediaAdjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  grayscale: 0,
  sepia: 0,
  blur: 0,
};

export const DEFAULT_IMAGE_SETTINGS: ImageSettings = {
  ...DEFAULT_ADJUSTMENTS,
  rotate: 0,
  flipH: false,
  flipV: false,
  fit: "contain",
  scrim: false,
};

export const DEFAULT_VIDEO_SETTINGS: VideoSettings = {
  ...DEFAULT_ADJUSTMENTS,
  trimStart: 0,
  trimEnd: null,
  volume: 100,
  muted: false,
  loop: false,
  playbackRate: 1,
  fit: "contain",
};

/**
 * Backgrounds start where they have always been painted: covering the slide,
 * with the darken overlay on for legibility.
 */
export const DEFAULT_BACKGROUND_IMAGE_SETTINGS: ImageSettings = {
  ...DEFAULT_ADJUSTMENTS,
  rotate: 0,
  flipH: false,
  flipV: false,
  fit: "cover",
  scrim: true,
};

export const imageSettingsOf = (item: MediaItem): ImageSettings => ({
  ...DEFAULT_IMAGE_SETTINGS,
  ...(item.image || {}),
});

export const isImageBackground = (background?: Background): boolean =>
  background?.type === "image";

export const backgroundImageSettings = (
  background?: Background,
): ImageSettings => ({
  ...DEFAULT_BACKGROUND_IMAGE_SETTINGS,
  ...(background?.image || {}),
});

/**
 * The settings a new usage of a background starts from. Copying them at the
 * moment the picture is chosen is what keeps a later edit in the asset library
 * out of the documents that already use it.
 */
export const snapshotBackgroundImage = (
  background?: Background,
): ImageSettings | undefined =>
  isImageBackground(background)
    ? backgroundImageSettings(background)
    : undefined;

export const videoSettingsOf = (item: MediaItem): VideoSettings => ({
  ...DEFAULT_VIDEO_SETTINGS,
  ...(item.video || {}),
});

export function buildFilter(adjustments: MediaAdjustments): string {
  const parts: string[] = [];
  if (adjustments.brightness !== 100)
    parts.push(`brightness(${adjustments.brightness}%)`);
  if (adjustments.contrast !== 100)
    parts.push(`contrast(${adjustments.contrast}%)`);
  if (adjustments.saturation !== 100)
    parts.push(`saturate(${adjustments.saturation}%)`);
  if (adjustments.grayscale > 0)
    parts.push(`grayscale(${adjustments.grayscale}%)`);
  if (adjustments.sepia > 0) parts.push(`sepia(${adjustments.sepia}%)`);
  if (adjustments.blur > 0) parts.push(`blur(${adjustments.blur}px)`);
  return parts.length ? parts.join(" ") : "none";
}

/** The turns and flips a picture carries, for composing into a transform. */
export function imageTransformParts(settings: ImageSettings): string[] {
  const parts: string[] = [];
  if (settings.rotate) parts.push(`rotate(${settings.rotate}deg)`);
  if (settings.flipH) parts.push("scaleX(-1)");
  if (settings.flipV) parts.push("scaleY(-1)");
  return parts;
}

/** Stable newest-first ordering (createdAt, so edits don't reshuffle decks mid-show). */
export const sortMediaByRecency = (a: MediaItem, b: MediaItem): number =>
  b.createdAt > a.createdAt ? 1 : b.createdAt < a.createdAt ? -1 : 0;

/** Where a clip has got to, against the trim window it is being played inside. */
export interface VideoProgress {
  time: number;
  start: number;
  end: number;
}

/** The clip's position clamped into its trim window. */
export const videoPosition = ({ time, start, end }: VideoProgress): number =>
  Math.min(Math.max(time, start), Math.max(end, start));

/** The share of the trim window already played, 0 to 100. */
export function videoProgressPercent(progress: VideoProgress): number {
  const span = Math.max(progress.end - progress.start, 0);
  if (!span) return 0;
  return ((videoPosition(progress) - progress.start) / span) * 100;
}

const SECONDS_PER_HOUR = 3600;

const pad = (value: number): string => String(value).padStart(2, "0");

/** True once a clip is long enough to need an hours field in its timecodes. */
export const needsHoursField = (seconds?: number): boolean =>
  seconds !== undefined &&
  Number.isFinite(seconds) &&
  seconds >= SECONDS_PER_HOUR;

export function formatDuration(seconds?: number): string {
  if (seconds === undefined || !Number.isFinite(seconds)) return "";
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / SECONDS_PER_HOUR);
  const minutes = Math.floor((total % SECONDS_PER_HOUR) / 60);
  const secs = total % 60;
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(secs)}`
    : `${minutes}:${pad(secs)}`;
}

/**
 * A position in a clip written the way an editor types it: `mm:ss`, or
 * `hh:mm:ss` once the clip runs past an hour.
 */
export function formatTimecode(seconds: number, withHours: boolean): string {
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / SECONDS_PER_HOUR);
  const minutes = Math.floor((total % SECONDS_PER_HOUR) / 60);
  const secs = total % 60;
  return withHours
    ? `${pad(hours)}:${pad(minutes)}:${pad(secs)}`
    : `${pad(minutes)}:${pad(secs)}`;
}

/** How a timecode has to be written, for labels and error messages. */
export const timecodeShape = (withHours: boolean): string =>
  withHours ? "hh:mm:ss" : "mm:ss";

const TIMECODE_PATTERN = /^\d{2}:\d{2}$/;
const TIMECODE_WITH_HOURS_PATTERN = /^\d{2}:\d{2}:\d{2}$/;

/**
 * Reads a typed timecode back into seconds, insisting on two digits per field:
 * `01:30`, or `00:01:30` once the clip runs past an hour. Null for anything
 * else, so a half-typed field is left alone rather than snapping to a position
 * nobody asked for.
 */
export function parseTimecode(
  value: string,
  withHours: boolean,
): number | null {
  const text = value.trim();
  const pattern = withHours ? TIMECODE_WITH_HOURS_PATTERN : TIMECODE_PATTERN;
  if (!pattern.test(text)) return null;
  const parts = text.split(":").map(Number);
  // Everything below the leading field is a sixtieth of the one above it, so
  // `90` seconds is a typo rather than a minute and a half.
  if (parts.slice(1).some((part) => part > 59)) return null;
  return parts.reduce((total, part) => total * 60 + part, 0);
}

// What a finished timecode can still grow out of: every field is two digits,
// and the ones below the first run 00 to 59, so their tens digit is 0 to 5.
// `01:5` is on its way somewhere, `1:30` and `01:6` are not.
const PARTIAL_TIMECODE_PATTERN = /^(\d{0,2}|\d{2}:([0-5]\d?)?)$/;
const PARTIAL_TIMECODE_WITH_HOURS_PATTERN =
  /^(\d{0,2}|\d{2}:([0-5]\d?)?|\d{2}:[0-5]\d:([0-5]\d?)?)$/;

/**
 * True while what has been typed could still be finished into a timecode, so a
 * field being written into is left alone instead of being told off for every
 * keystroke on the way to `01:30`.
 */
export const isPartialTimecode = (value: string, withHours: boolean): boolean =>
  (withHours
    ? PARTIAL_TIMECODE_WITH_HOURS_PATTERN
    : PARTIAL_TIMECODE_PATTERN
  ).test(value.trim());

/** What a trim point is checked against: the clip it belongs to. */
export interface TrimBounds {
  /** The clip's length. Unknown until its headers are in, and then skipped. */
  duration?: number;
  withHours: boolean;
}

/**
 * The rules both trim points answer to: a position lives inside the clip, and
 * the window between them has to be worth playing. Returns the message to show
 * the operator, or null when the position is usable.
 */
export function validateTrimStart(
  seconds: number | null,
  trimEnd: number | null,
  { duration, withHours }: TrimBounds,
): string | null {
  if (seconds === null)
    return `Enter a start time as ${timecodeShape(withHours)}.`;
  if (seconds < 0)
    return "The start can't be before the beginning of the clip.";
  if (duration && seconds >= duration)
    return `The start has to be before the end of the clip (${formatTimecode(duration, withHours)}).`;
  if (trimEnd === null) return null;
  if (seconds === trimEnd) return "The start and end can't be the same.";
  if (seconds > trimEnd) return "The start has to come before the end.";
  return null;
}

export function validateTrimEnd(
  seconds: number | null,
  trimStart: number,
  { duration, withHours }: TrimBounds,
): string | null {
  // An empty end is the clip's last frame, which is always a usable window.
  if (seconds === null) return null;
  if (duration && seconds > duration)
    return `The end can't be past the clip's length (${formatTimecode(duration, withHours)}).`;
  if (seconds === trimStart) return "The start and end can't be the same.";
  if (seconds < trimStart) return "The end has to come after the start.";
  return null;
}

export interface MediaProbe {
  duration?: number;
  width?: number;
  height?: number;
}

const THUMB_MAX_DIM = 640;
const THUMB_QUALITY = 0.82;

/**
 * Reads duration/dimensions from a video File without decoding it into JS
 * memory: `preload="metadata"` over a temporary object URL only parses the
 * container headers. The URL is always revoked and the element detached.
 */
export function probeVideoFile(file: Blob): Promise<MediaProbe> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    const finish = (probe: MediaProbe) => {
      video.onloadedmetadata = null;
      video.onerror = null;
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
      resolve(probe);
    };
    video.preload = "metadata";
    video.muted = true;
    video.onloadedmetadata = () =>
      finish({
        duration: Number.isFinite(video.duration) ? video.duration : undefined,
        width: video.videoWidth || undefined,
        height: video.videoHeight || undefined,
      });
    video.onerror = () => finish({});
    video.src = url;
  });
}

export interface ImageProbeResult extends MediaProbe {
  thumbnail: Blob | null;
}

/**
 * Decodes an image File once to read its dimensions and produce a small JPEG
 * thumbnail for grid views, so lists never load the full-resolution original.
 */
export async function probeImageFile(file: Blob): Promise<ImageProbeResult> {
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const scale = Math.min(1, THUMB_MAX_DIM / Math.max(width, height, 1));
    const thumbWidth = Math.max(1, Math.round(width * scale));
    const thumbHeight = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = thumbWidth;
    canvas.height = thumbHeight;
    const ctx = canvas.getContext("2d");
    let thumbnail: Blob | null = null;
    if (ctx) {
      ctx.drawImage(bitmap, 0, 0, thumbWidth, thumbHeight);
      thumbnail = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", THUMB_QUALITY),
      );
    }
    bitmap.close();
    canvas.width = 0;
    canvas.height = 0;
    return { width, height, thumbnail };
  } catch {
    return { thumbnail: null };
  }
}

export function isAcceptedMediaFile(
  kind: "image" | "video",
  file: File,
): boolean {
  return file.type.startsWith(`${kind}/`);
}
