import type { CSSProperties } from "react";
import type { MediaFit } from "../../types";
import { useStore } from "../../store/useStore";
import {
  backgroundImageSettings,
  imageSettingsOf,
  isImageBackground,
} from "../../lib/media";
import { BackgroundSurface } from "../../components/media/BackgroundSurface";
import { ImageSurface } from "../../components/media/ImageSurface";
import type { OverlayImageRef } from "./lib/overlayAppearance";

/**
 * Paints a picture an overlay points at, from whichever library holds it.
 *
 * Two libraries carry pictures in this app — the media module and the asset
 * library's backgrounds — and an operator dressing a broadcast does not care
 * which one a logo or a texture came from. This is the one place that difference
 * is resolved, so every caller (the picture overlay itself, a panel's backdrop,
 * a badge's backdrop) points at an image the same way.
 */
export function OverlayPicture({
  image,
  fit,
  style,
}: {
  image: OverlayImageRef;
  /** Overrides the library's own fit, for backdrops that must cover their box. */
  fit?: MediaFit;
  style?: CSSProperties;
}) {
  const media = useStore((s) => s.media);
  const backgrounds = useStore((s) => s.backgrounds);

  if (image.source === "background") {
    const background = backgrounds.find((entry) => entry.id === image.id);
    if (!background) return null;
    const settings = isImageBackground(background)
      ? {
          ...backgroundImageSettings(background),
          ...(fit ? { fit } : {}),
          scrim: false,
        }
      : undefined;
    return (
      <BackgroundSurface
        background={background}
        settings={settings}
        // Transparent behind the picture, so a "contain" fit shows the camera
        // in its letterbox rather than the asset library's dark plate.
        style={{ background: "transparent", ...style }}
      />
    );
  }

  const item = media.find(
    (entry) => entry.id === image.id && entry.kind === "image",
  );
  if (!item) return null;
  return (
    <ImageSurface
      item={item}
      settings={fit ? { ...imageSettingsOf(item), fit } : undefined}
      style={{ background: "transparent", ...style }}
    />
  );
}
