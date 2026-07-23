import type { CSSProperties } from "react";
import type { ImageSettings, MediaItem } from "../../types";
import {
  buildFilter,
  buildImageTransform,
  imageSettingsOf,
} from "../../lib/media";
import { useBlobUrl, useThumbUrl } from "../../lib/blobUrls";

interface ImageSurfaceProps {
  item: MediaItem;
  /** Overrides the item's stored settings (used for live editor previews). */
  settings?: ImageSettings;
  /** "thumb" resolves the small stored thumbnail, use it in grids and previews. */
  variant?: "full" | "thumb";
  style?: CSSProperties;
}

/**
 * Renders inside a 16:9 box (thumbnails and the stage both are). The pixels
 * come from an on-demand object URL that is revoked when the surface unmounts.
 * When the rotation swaps axes the image is scaled by the box ratio so
 * "contain" keeps fitting and "cover"/"fill" keep covering.
 */
export function ImageSurface({
  item,
  settings,
  variant = "full",
  style,
}: ImageSurfaceProps) {
  const fullUrl = useBlobUrl(variant === "full" ? item.id : null);
  const thumbUrl = useThumbUrl(variant === "thumb" ? item.id : null);
  const src = variant === "thumb" ? thumbUrl : fullUrl;
  const applied = settings ?? imageSettingsOf(item);
  const swapAxes = applied.rotate === 90 || applied.rotate === 270;
  const ratioScale = swapAxes
    ? applied.fit === "contain"
      ? 9 / 16
      : 16 / 9
    : 1;
  const transform = buildImageTransform(applied);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        display: "grid",
        placeItems: "center",
        background: "#000",
        ...style,
      }}
    >
      {src && (
        <img
          src={src}
          alt={item.name}
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: applied.fit,
            filter: buildFilter(applied),
            transform:
              ratioScale !== 1
                ? `${transform} scale(${ratioScale})`
                : transform,
          }}
        />
      )}
      {applied.scrim && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(0deg,rgba(0,0,0,0.55),rgba(0,0,0,0.25))",
          }}
        />
      )}
    </div>
  );
}
