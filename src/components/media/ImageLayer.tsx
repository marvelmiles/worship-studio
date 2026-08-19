import { useRef } from "react";
import type { CSSProperties } from "react";
import type { ImageSettings } from "../../types";
import { buildFilter, imageTransformParts } from "../../lib/media";
import { useElementSize } from "../../hooks/useElementSize";

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
 * box it is dropped into.
 *
 * A quarter turn swaps which axis of the box the picture is laid along, so the
 * frame is given the box's own height as its width and vice versa before being
 * rotated back over it. Those two lengths are measured off the box rather than
 * written in CSS, because no CSS length can name the other axis of an ancestor,
 * and the turned frame is centred by translation rather than by an alignment
 * property, because it is deliberately larger than the box it sits in and
 * browsers may align an overflowing item from its start edge instead. Without
 * both, a turned picture hangs out of the frame it was dropped into.
 */
export function ImageLayer({ src, alt, settings, style }: ImageLayerProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const { width, height } = useElementSize(frameRef);
  const swapAxes =
    (settings.rotate === 90 || settings.rotate === 270) &&
    width > 0 &&
    height > 0;

  return (
    <div
      ref={frameRef}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
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
            position: "absolute",
            top: "50%",
            left: "50%",
            width: swapAxes ? height : "100%",
            height: swapAxes ? width : "100%",
            objectFit: settings.fit,
            filter: buildFilter(settings),
            transform: [
              "translate(-50%, -50%)",
              ...imageTransformParts(settings),
            ].join(" "),
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
