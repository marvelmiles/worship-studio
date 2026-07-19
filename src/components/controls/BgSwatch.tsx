import type { CSSProperties, ReactNode } from "react";
import type { Background } from "../../types";
import { useThumbUrl } from "../../lib/blobUrls";

/** CSS background value for gradient/solid/legacy-inline backgrounds. */
export function swatchBackground(bg: Background): string {
  if (bg.type === "solid") return bg.color || "#111";
  if (bg.type === "image") return bg.dataUrl ? `center/cover url(${bg.dataUrl})` : "#0a0a0c";
  return bg.css || "#111";
}

interface BgSwatchProps {
  bg?: Background;
  style?: CSSProperties;
  children?: ReactNode;
}

/**
 * Small preview surface for any background. Gradient/solid backgrounds render
 * their CSS directly; uploaded image backgrounds resolve their stored
 * thumbnail to an object URL only while this swatch is mounted.
 */
export function BgSwatch({ bg, style, children }: BgSwatchProps) {
  const blobUrl = useThumbUrl(bg?.blobId);
  const background = bg
    ? bg.blobId
      ? blobUrl
        ? `center/cover url(${blobUrl})`
        : "#0a0a0c"
      : swatchBackground(bg)
    : "#0a0a0c";
  return <div style={{ background, ...style }}>{children}</div>;
}
