import type { CSSProperties, SyntheticEvent } from "react";
import type { MediaItem } from "../../types";
import { useBlobUrl } from "../../lib/blobUrls";
import { buildFilter, videoSettingsOf } from "../../lib/media";

const COVER_OFFSET_RATIO = 0.1;
const COVER_OFFSET_MAX_SECONDS = 1;
const END_MARGIN_SECONDS = 0.05;

interface VideoThumbProps {
  item: MediaItem;
  applySettings?: boolean;
  style?: CSSProperties;
}

/* A clip's opening frame is often black, and a video that has only loaded its
   metadata paints nothing at all, so the thumb seeks into the clip to decode a
   real frame as its cover. */
const coverTime = (trimStart: number, duration: number): number => {
  const target =
    trimStart > 0
      ? trimStart
      : Math.min(duration * COVER_OFFSET_RATIO, COVER_OFFSET_MAX_SECONDS);
  return Math.max(0, Math.min(target, duration - END_MARGIN_SECONDS));
};

export const VideoThumb = ({ item, applySettings, style }: VideoThumbProps) => {
  const src = useBlobUrl(item.id);
  if (!src) return null;
  const { trimStart } = videoSettingsOf(item);
  const settings = applySettings ? videoSettingsOf(item) : null;

  const showCover = (event: SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
    if (!Number.isFinite(video.duration) || video.duration <= 0) return;
    video.currentTime = coverTime(trimStart, video.duration);
  };

  return (
    <video
      src={src}
      muted
      playsInline
      preload="metadata"
      onLoadedMetadata={showCover}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: settings?.fit ?? "cover",
        filter: settings ? buildFilter(settings) : undefined,
        ...style,
      }}
    />
  );
};
