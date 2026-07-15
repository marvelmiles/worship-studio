import type { CSSProperties } from "react";
import type { MediaItem } from "../../types";
import { useBlobUrl } from "../../lib/blobUrls";

interface VideoThumbProps {
  item: MediaItem;
  style?: CSSProperties;
}

/**
 * Grid/preview poster for a video: loads container metadata plus the first
 * frame only (`preload="metadata"`), never the stream. Meant to sit inside a
 * LazyMount so off-screen cards hold no object URL at all.
 */
export function VideoThumb({ item, style }: VideoThumbProps) {
  const src = useBlobUrl(item.id);
  if (!src) return null;
  return (
    <video
      src={src}
      muted
      preload="metadata"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        ...style,
      }}
    />
  );
}
