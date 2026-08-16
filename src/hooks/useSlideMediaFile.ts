import type { SlideMedia } from "../types";
import { useStore } from "../store/useStore";
import { useBlobUrl } from "../lib/blobUrls";
import { placedMediaSource } from "../lib/slideMedia";

export interface SlideMediaFile {
  /** Null while the blob is still resolving, or when the file is gone. */
  url: string | null;
  name: string;
  /** True when neither library still holds what this placement points at. */
  missing: boolean;
  /** Recorded length of a clip, when the library that holds it knows one. */
  duration?: number;
}

/**
 * Resolves a placement to something paintable, whichever library it came from:
 * media-library uploads stream from the files store, asset-library pictures
 * from their own blob or the inline data the bundled ones carry.
 */
export function useSlideMediaFile(media: SlideMedia): SlideMediaFile {
  const library = useStore((s) => s.media);
  const backgrounds = useStore((s) => s.backgrounds);

  const fromAssets = placedMediaSource(media) === "background";
  const background = fromAssets
    ? backgrounds.find((entry) => entry.id === media.mediaId)
    : undefined;
  const item = fromAssets
    ? undefined
    : library.find((entry) => entry.id === media.mediaId);

  const blobUrl = useBlobUrl(
    fromAssets ? (background?.blobId ?? null) : (item?.id ?? null),
  );

  if (fromAssets)
    return {
      url: background?.blobId ? blobUrl : (background?.dataUrl ?? null),
      name: background?.name ?? "",
      missing: !background,
    };

  return {
    url: blobUrl,
    name: item?.name ?? "",
    missing: !item,
    duration: item?.duration,
  };
}
