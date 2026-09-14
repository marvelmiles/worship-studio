import type { CSSProperties } from "react";
import type { MediaItem } from "../../types";
import { useBlobUrl } from "../../lib/blobUrls";
import { buildFilter, videoSettingsOf } from "../../lib/media";

interface VideoThumbProps {
  item: MediaItem;
  /**
   * Poses the poster the way the clip plays: on its trim start frame, graded
   * and fitted by its own settings. Off in library grids, which show the file.
   */
  applySettings?: boolean;
  style?: CSSProperties;
}

/**
 * Grid/preview poster for a video: loads container metadata plus the first
 * frame only (`preload="metadata"`), never the stream. Meant to sit inside a
 * LazyMount so off-screen cards hold no object URL at all.
 */
export function VideoThumb({ item, applySettings, style }: VideoThumbProps) {
  const src = useBlobUrl(item.id);
  if (!src) return null;
  const settings = applySettings ? videoSettingsOf(item) : null;
  // A media fragment parks the poster on the trim start without a seek.
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
}
