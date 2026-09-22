import type {
  AudioItem,
  AudioSettings,
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

/** A moving background fills the frame, runs silently and never stops. */
export const DEFAULT_BACKGROUND_VIDEO_SETTINGS: VideoSettings = {
  ...DEFAULT_VIDEO_SETTINGS,
  fit: "cover",
  muted: true,
  loop: true,
};

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

export const isVideoBackground = (background?: Background): boolean =>
  background?.type === "video" && Boolean(background.mediaId);

export const isMediaBackground = (background?: Background): boolean =>
  isImageBackground(background) || isVideoBackground(background);

export const backgroundImageSettings = (
  background?: Background,
): ImageSettings => ({
  ...DEFAULT_BACKGROUND_IMAGE_SETTINGS,
  ...(background?.image || {}),
});

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

export const backgroundVideoSettings = (item?: MediaItem): VideoSettings => ({
  ...DEFAULT_BACKGROUND_VIDEO_SETTINGS,
  ...(item?.video || {}),
  fit: item?.video?.fit ?? DEFAULT_BACKGROUND_VIDEO_SETTINGS.fit,
  muted: true,
  loop: true,
});

/* Stored in place of a sound to keep a slide, document or theme silent on
   purpose, so the choice stops here instead of falling through to whatever it
   would otherwise inherit. */
export const NO_AUDIO_ID = "none";

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  trimStart: 0,
  trimEnd: null,
  volume: 100,
};

export const audioSettingsOf = (item: AudioItem): AudioSettings => ({
  ...DEFAULT_AUDIO_SETTINGS,
  ...(item.settings || {}),
});

export const buildFilter = (adjustments: MediaAdjustments): string => {
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
};

export const imageTransformParts = (settings: ImageSettings): string[] => {
  const parts: string[] = [];
  if (settings.rotate) parts.push(`rotate(${settings.rotate}deg)`);
  if (settings.flipH) parts.push("scaleX(-1)");
  if (settings.flipV) parts.push("scaleY(-1)");
  return parts;
};

export const sortMediaByRecency = (a: MediaItem, b: MediaItem): number =>
  b.createdAt > a.createdAt ? 1 : b.createdAt < a.createdAt ? -1 : 0;

export interface VideoProgress {
  time: number;
  start: number;
  end: number;
}

export const videoPosition = ({ time, start, end }: VideoProgress): number =>
  Math.min(Math.max(time, start), Math.max(end, start));

export const videoProgressPercent = (progress: VideoProgress): number => {
  const span = Math.max(progress.end - progress.start, 0);
  if (!span) return 0;
  return ((videoPosition(progress) - progress.start) / span) * 100;
};

const SECONDS_PER_HOUR = 3600;

const pad = (value: number): string => String(value).padStart(2, "0");

export const needsHoursField = (seconds?: number): boolean =>
  seconds !== undefined &&
  Number.isFinite(seconds) &&
  seconds >= SECONDS_PER_HOUR;

export const formatDuration = (seconds?: number): string => {
  if (seconds === undefined || !Number.isFinite(seconds)) return "";
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / SECONDS_PER_HOUR);
  const minutes = Math.floor((total % SECONDS_PER_HOUR) / 60);
  const secs = total % 60;
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(secs)}`
    : `${minutes}:${pad(secs)}`;
};

export const formatTimecode = (seconds: number, withHours: boolean): string => {
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / SECONDS_PER_HOUR);
  const minutes = Math.floor((total % SECONDS_PER_HOUR) / 60);
  const secs = total % 60;
  return withHours
    ? `${pad(hours)}:${pad(minutes)}:${pad(secs)}`
    : `${pad(minutes)}:${pad(secs)}`;
};

export interface TrimRange {
  trimStart: number;
  trimEnd: number | null;
}

const knownLength = (duration?: number): number | undefined =>
  duration !== undefined && Number.isFinite(duration) && duration > 0
    ? duration
    : undefined;

export const trimmedDuration = (
  duration?: number,
  trim?: TrimRange,
): number | undefined => {
  const fullLength = knownLength(duration);
  const start = Math.max(0, trim?.trimStart ?? 0);
  const end = trim?.trimEnd ?? fullLength;
  if (end === undefined) return undefined;
  const cappedEnd = fullLength === undefined ? end : Math.min(end, fullLength);
  return Math.max(0, cappedEnd - start);
};

export const isTrimmed = (duration?: number, trim?: TrimRange): boolean => {
  const played = trimmedDuration(duration, trim);
  const fullLength = knownLength(duration);
  return (
    played !== undefined &&
    fullLength !== undefined &&
    Math.round(played) !== Math.round(fullLength)
  );
};

export const formatTrimmedDuration = (
  duration?: number,
  trim?: TrimRange,
): string => {
  const played = trimmedDuration(duration, trim);
  if (played === undefined) return "";
  return isTrimmed(duration, trim)
    ? `${formatDuration(played)} of ${formatDuration(duration)}`
    : formatDuration(played);
};

export const mediaPlayLength = (item: MediaItem): number | undefined =>
  item.kind === "video"
    ? trimmedDuration(item.duration, item.video)
    : item.duration;

export const audioPlayLength = (item: AudioItem): number | undefined =>
  trimmedDuration(item.duration, item.settings);

export const timecodeShape = (withHours: boolean): string =>
  withHours ? "hh:mm:ss" : "mm:ss";

const TIMECODE_PATTERN = /^\d{2}:\d{2}$/;
const TIMECODE_WITH_HOURS_PATTERN = /^\d{2}:\d{2}:\d{2}$/;

export const parseTimecode = (
  value: string,
  withHours: boolean,
): number | null => {
  const text = value.trim();
  const pattern = withHours ? TIMECODE_WITH_HOURS_PATTERN : TIMECODE_PATTERN;
  if (!pattern.test(text)) return null;
  const parts = text.split(":").map(Number);
  if (parts.slice(1).some((part) => part > 59)) return null;
  return parts.reduce((total, part) => total * 60 + part, 0);
};

const PARTIAL_TIMECODE_PATTERN = /^(\d{0,2}|\d{2}:([0-5]\d?)?)$/;
const PARTIAL_TIMECODE_WITH_HOURS_PATTERN =
  /^(\d{0,2}|\d{2}:([0-5]\d?)?|\d{2}:[0-5]\d:([0-5]\d?)?)$/;

export const isPartialTimecode = (value: string, withHours: boolean): boolean =>
  (withHours
    ? PARTIAL_TIMECODE_WITH_HOURS_PATTERN
    : PARTIAL_TIMECODE_PATTERN
  ).test(value.trim());

export interface TrimBounds {
  duration?: number;
  withHours: boolean;
}

export const validateTrimStart = (
  seconds: number | null,
  trimEnd: number | null,
  { duration, withHours }: TrimBounds,
): string | null => {
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
};

export const validateTrimEnd = (
  seconds: number | null,
  trimStart: number,
  { duration, withHours }: TrimBounds,
): string | null => {
  if (seconds === null) return null;
  if (duration && seconds > duration)
    return `The end can't be past the clip's length (${formatTimecode(duration, withHours)}).`;
  if (seconds === trimStart) return "The start and end can't be the same.";
  if (seconds < trimStart) return "The end has to come after the start.";
  return null;
};

export interface MediaProbe {
  duration?: number;
  width?: number;
  height?: number;
}

const THUMB_MAX_DIM = 640;
const THUMB_QUALITY = 0.82;

export const probeVideoFile = (file: Blob): Promise<MediaProbe> => {
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
};

export const probeAudioFile = (file: Blob): Promise<MediaProbe> =>
  probeVideoFile(file);

export interface ImageProbeResult extends MediaProbe {
  thumbnail: Blob | null;
}

export const probeImageFile = async (file: Blob): Promise<ImageProbeResult> => {
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
};

export const isAcceptedMediaFile = (
  kind: "image" | "video",
  file: File,
): boolean => {
  return file.type.startsWith(`${kind}/`);
};
