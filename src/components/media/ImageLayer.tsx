import type { CSSProperties } from "react";
import type { ImageSettings } from "../../types";
import { buildFilter, buildImageTransform } from "../../lib/media";

export const SCRIM_GRADIENT =
  "linear-gradient(0deg,rgba(0,0,0,0.55),rgba(0,0,0,0.25))";

interface ImageLayerProps {
  src: string | null;
  alt: string;
  settings: ImageSettings;
  style?: CSSProperties;
}

/**
 * Paints one picture with its editing settings applied, filling the positioned
 * box it is dropped into (thumbnails, the slide canvas and the stage all are
 * 16:9). When the rotation swaps axes the image is scaled by the box ratio so
 * "contain" keeps fitting and "cover"/"fill" keep covering.
 */
export function ImageLayer({ src, alt, settings, style }: ImageLayerProps) {
  const swapAxes = settings.rotate === 90 || settings.rotate === 270;
  const ratioScale = swapAxes
    ? settings.fit === "contain"
      ? 9 / 16
      : 16 / 9
    : 1;
  const transform = buildImageTransform(settings);
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
          alt={alt}
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: settings.fit,
            filter: buildFilter(settings),
            transform:
              ratioScale !== 1
                ? `${transform} scale(${ratioScale})`
                : transform,
          }}
        />
      )}
      {settings.scrim && (
        <div
          style={{ position: "absolute", inset: 0, background: SCRIM_GRADIENT }}
        />
      )}
    </div>
  );
}
