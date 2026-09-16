import type { CSSProperties } from "react";
import type { MediaItem } from "../../types";
import { useBlobUrl } from "../../lib/blobUrls";
import { buildFilter, videoSettingsOf } from "../../lib/media";

interface VideoThumbProps {
  item: MediaItem;
  applySettings?: boolean;
  style?: CSSProperties;
}

export const VideoThumb = ({ item, applySettings, style }: VideoThumbProps) => {
  const src = useBlobUrl(item.id);
  if (!src) return null;
  const settings = applySettings ? videoSettingsOf(item) : null;
  const posterSrc =
    settings && settings.trimStart > 0 ? `${src}#t=${settings.trimStart}` : src;
  return (
    <video
      src={posterSrc}
      muted
      preload="metadata"
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
