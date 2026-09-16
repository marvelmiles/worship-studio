import type { CSSProperties } from "react";
import type { ImageSettings, MediaItem } from "../../types";
import { imageSettingsOf } from "../../lib/media";
import { useBlobUrl, useThumbUrl } from "../../lib/blobUrls";
import { ImageLayer } from "./ImageLayer";

interface ImageSurfaceProps {
  item: MediaItem;
  settings?: ImageSettings;
  variant?: "full" | "thumb";
  style?: CSSProperties;
}

export const ImageSurface = ({
  item,
  settings,
  variant = "full",
  style,
}: ImageSurfaceProps) => {
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
};
