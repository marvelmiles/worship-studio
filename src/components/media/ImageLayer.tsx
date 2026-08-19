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
 * 16:9).
 *
 * A quarter turn swaps which axis of the box the picture is laid along, so the
 * frame is given the box's own height as its width and vice versa before being
 * rotated back over it. Container query units read those two lengths off the
 * box itself, which keeps a rotated picture inside any frame it is dropped
 * into rather than only a 16:9 one.
 */
export function ImageLayer({ src, alt, settings, style }: ImageLayerProps) {
  const swapAxes = settings.rotate === 90 || settings.rotate === 270;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        display: "grid",
        placeItems: "center",
        background: "#000",
        containerType: swapAxes ? "size" : undefined,
        ...style,
      }}
    >
      {src && (
        <img
          src={src}
          alt={alt}
          draggable={false}
          style={{
            width: swapAxes ? "100cqh" : "100%",
            height: swapAxes ? "100cqw" : "100%",
            objectFit: settings.fit,
            filter: buildFilter(settings),
            transform: buildImageTransform(settings),
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
