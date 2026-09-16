import type { SlideMedia } from "../types";
import { useStore } from "../store/useStore";
import { useBlobUrl } from "../lib/blobUrls";
import { placedMediaSource } from "../lib/slideMedia";

export interface SlideMediaFile {
  url: string | null;
  name: string;
  missing: boolean;
  duration?: number;
}

export const useSlideMediaFile = (media: SlideMedia): SlideMediaFile => {
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
};
