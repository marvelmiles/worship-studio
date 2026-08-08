import type { CSSProperties } from "react";
import type { ImageSettings, MediaItem } from "../../types";
import { imageSettingsOf } from "../../lib/media";
import { useBlobUrl, useThumbUrl } from "../../lib/blobUrls";
import { ImageLayer } from "./ImageLayer";

interface ImageSurfaceProps {
  item: MediaItem;
  /** Overrides the item's stored settings (used for live editor previews). */
  settings?: ImageSettings;
  /** "thumb" resolves the small stored thumbnail, use it in grids and previews. */
  variant?: "full" | "thumb";
  style?: CSSProperties;
}

/**
 * Renders a media-library picture inside a 16:9 box. The pixels come from an
 * on-demand object URL that is revoked when the surface unmounts.
 */
export function ImageSurface({
  item,
  settings,
  variant = "full",
  style,
}: ImageSurfaceProps) {
  const fullUrl = useBlobUrl(variant === "full" ? item.id : null);
  const thumbUrl = useThumbUrl(variant === "thumb" ? item.id : null);
  return (
    <ImageLayer
      src={variant === "thumb" ? thumbUrl : fullUrl}
      alt={item.name}
      settings={settings ?? imageSettingsOf(item)}
      style={style}
    />
  );
}
