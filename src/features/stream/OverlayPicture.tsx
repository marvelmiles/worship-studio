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

export const OverlayPicture = ({
  image,
  fit,
  style,
}: {
  image: OverlayImageRef;
  fit?: MediaFit;
  style?: CSSProperties;
}) => {
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
};
