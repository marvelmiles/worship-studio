import type { CSSProperties } from "react";
import type { Background, ImageSettings, VideoSettings } from "../../types";
import {
  backgroundImageSettings,
  isImageBackground,
  isVideoBackground,
} from "../../lib/media";
import { useBlobUrl, useThumbUrl } from "../../lib/blobUrls";
import { useStore } from "../../store/useStore";
import { ImageLayer } from "./ImageLayer";
import { VideoThumb } from "./VideoThumb";
import { BackgroundVideoLayer } from "./BackgroundVideoLayer";

const EMPTY_SURFACE = "#0a0a0c";

const backgroundCss = (background?: Background): string => {
  if (!background) return EMPTY_SURFACE;
  if (background.type === "solid") return background.color || "#111";
  return background.css || "#111";
};

type SurfaceVariant = "full" | "thumb";

interface BackgroundSurfaceProps {
  background?: Background;
  settings?: ImageSettings | null;
  videoSettings?: VideoSettings | null;
  variant?: SurfaceVariant;
  style?: CSSProperties;
}

export const BackgroundSurface = ({
  background,
  settings,
  videoSettings,
  variant = "full",
  style,
}: BackgroundSurfaceProps) => {
  if (isVideoBackground(background))
    return (
      <VideoBackgroundSurface
        mediaId={background?.mediaId ?? ""}
        settings={videoSettings}
        variant={variant}
        style={style}
      />
    );
  if (isImageBackground(background))
    return (
      <ImageBackgroundSurface
        background={background}
        settings={settings}
        variant={variant}
        style={style}
      />
    );
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
};

const ImageBackgroundSurface = ({
  background,
  settings,
  variant,
  style,
}: Required<Pick<BackgroundSurfaceProps, "variant">> &
  Omit<BackgroundSurfaceProps, "variant">) => {
  const blobId = background?.blobId;
  const thumbUrl = useThumbUrl(variant === "thumb" ? blobId : null);
  const fullUrl = useBlobUrl(variant === "full" ? blobId : null);
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
      style={{ background: EMPTY_SURFACE, ...style }}
    />
  );
};

const VideoBackgroundSurface = ({
  mediaId,
  settings,
  variant,
  style,
}: {
  mediaId: string;
  settings?: VideoSettings | null;
  variant: SurfaceVariant;
  style?: CSSProperties;
}) => {
  const item = useStore((s) =>
    s.media.find((entry) => entry.id === mediaId && entry.kind === "video"),
  );
  const surfaceStyle: CSSProperties = { background: EMPTY_SURFACE, ...style };

  if (!item)
    return <div style={{ position: "absolute", inset: 0, ...surfaceStyle }} />;
  if (variant === "full")
    return (
      <BackgroundVideoLayer
        item={item}
        settings={settings}
        style={surfaceStyle}
      />
    );
  return (
    <div style={{ position: "absolute", inset: 0, ...surfaceStyle }}>
      <VideoThumb item={item} applySettings />
    </div>
  );
};
