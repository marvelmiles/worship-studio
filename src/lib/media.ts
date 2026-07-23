import type {
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

export const imageSettingsOf = (item: MediaItem): ImageSettings => ({
  ...DEFAULT_IMAGE_SETTINGS,
  ...(item.image || {}),
});

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

export function buildImageTransform(settings: ImageSettings): string {
  const parts: string[] = [];
  if (settings.rotate) parts.push(`rotate(${settings.rotate}deg)`);
  if (settings.flipH) parts.push("scaleX(-1)");
  if (settings.flipV) parts.push("scaleY(-1)");
  return parts.length ? parts.join(" ") : "none";
}

/** Stable newest-first ordering (createdAt, so edits don't reshuffle decks mid-show). */
export const sortMediaByRecency = (a: MediaItem, b: MediaItem): number =>
  b.createdAt > a.createdAt ? 1 : b.createdAt < a.createdAt ? -1 : 0;

export function formatDuration(seconds?: number): string {
  if (seconds === undefined || !Number.isFinite(seconds)) return "";
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
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
