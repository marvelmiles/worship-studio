import type { CSSProperties } from "react";
import type { Background, ImageSettings } from "../../types";
import { backgroundImageSettings, isImageBackground } from "../../lib/media";
import { useBlobUrl, useThumbUrl } from "../../lib/blobUrls";
import { ImageLayer } from "./ImageLayer";

/** CSS background value for gradient, solid and missing backgrounds. */
function backgroundCss(background?: Background): string {
  if (!background) return "#0a0a0c";
  if (background.type === "solid") return background.color || "#111";
  return background.css || "#111";
}

interface BackgroundSurfaceProps {
  background?: Background;
  /** Effective picture settings for this usage; falls back to the asset's own. */
  settings?: ImageSettings | null;
  /** "thumb" resolves the small stored thumbnail, use it in grids and previews. */
  variant?: "full" | "thumb";
  style?: CSSProperties;
}

/**
 * Fills its positioned parent with a background: gradients and solids as plain
 * CSS, pictures through the same layer the media library uses, so a background
 * looks identical wherever it is shown.
 */
export function BackgroundSurface({
  background,
  settings,
  variant = "full",
  style,
}: BackgroundSurfaceProps) {
  const isImage = isImageBackground(background);
  const blobId = isImage ? background?.blobId : undefined;
  const thumbUrl = useThumbUrl(variant === "thumb" ? blobId : null);
  const fullUrl = useBlobUrl(variant === "full" ? blobId : null);

  if (!isImage)
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: backgroundCss(background),
          ...style,
        }}
      />
    );

  const src = blobId
    ? variant === "thumb"
      ? thumbUrl
      : fullUrl
    : background?.dataUrl || null;

  return (
    <ImageLayer
      src={src}
      alt={background?.name || ""}
      settings={settings ?? backgroundImageSettings(background)}
      style={{ background: "#0a0a0c", ...style }}
    />
  );
}
