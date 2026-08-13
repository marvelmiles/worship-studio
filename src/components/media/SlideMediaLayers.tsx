import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import type { MediaItem, SlideMedia } from "../../types";
import { useStore } from "../../store/useStore";
import { useBlobUrl } from "../../lib/blobUrls";
import { buildFilter } from "../../lib/media";
import { placedImageSettings, placedVideoSettings } from "../../lib/slideMedia";
import { ImageLayer } from "./ImageLayer";

interface SlideMediaLayersProps {
  media: SlideMedia[];
  /** True on the projector: clips play rather than resting on their first frame. */
  live?: boolean;
}

const frameStyle = (media: SlideMedia): CSSProperties => ({
  position: "absolute",
  left: `${media.frame.x}%`,
  top: `${media.frame.y}%`,
  width: `${media.frame.width}%`,
  height: `${media.frame.height}%`,
  borderRadius: `${media.radius ?? 0}cqw`,
  overflow: "hidden",
  opacity: (media.opacity ?? 100) / 100,
  pointerEvents: "none",
});

/**
 * Paints the pictures and clips placed on a slide, in the order they are
 * stacked. Nothing here is interactive: the editor lays its own drag surface
 * over the slide (see features/editor/SlideMediaOverlay), so the same layers
 * render identically in a thumbnail, the editor and the projector.
 */
export function SlideMediaLayers({ media, live }: SlideMediaLayersProps) {
  const library = useStore((s) => s.media);
  return (
    <>
      {media.map((placed) => {
        const item = library.find((entry) => entry.id === placed.mediaId);
        return (
          <div key={placed.id} aria-hidden style={frameStyle(placed)}>
            {placed.kind === "image" ? (
              <PlacedImage media={placed} item={item} />
            ) : (
              <PlacedVideo media={placed} item={item} live={live} />
            )}
          </div>
        );
      })}
    </>
  );
}

function PlacedImage({ media, item }: { media: SlideMedia; item?: MediaItem }) {
  const url = useBlobUrl(item?.id ?? null);
  return (
    <ImageLayer
      src={url}
      alt={item?.name ?? ""}
      settings={placedImageSettings(media)}
      style={{ background: "transparent" }}
    />
  );
}

/**
 * A clip in its box. On the projector it starts itself; in the editor it holds
 * its trim-start frame so the writer can see what they placed without the slide
 * turning into a playing video while they type.
 */
function PlacedVideo({
  media,
  item,
  live,
}: {
  media: SlideMedia;
  item?: MediaItem;
  live?: boolean;
}) {
  const url = useBlobUrl(item?.id ?? null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const settings = placedVideoSettings(media);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    const element = videoRef.current;
    if (!element || !url) return;
    element.currentTime = settingsRef.current.trimStart;
    element.playbackRate = settingsRef.current.playbackRate;
    if (live) void element.play().catch(() => {});
    else element.pause();
  }, [url, live]);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;
    element.muted = !live || settings.muted;
    element.volume = Math.min(1, Math.max(0, settings.volume / 100));
  }, [live, settings.muted, settings.volume]);

  const handleTimeUpdate = () => {
    const element = videoRef.current;
    if (!element) return;
    const { trimStart, trimEnd, loop } = settingsRef.current;
    if (trimEnd === null || element.currentTime < trimEnd) return;
    if (loop) {
      element.currentTime = trimStart;
      void element.play().catch(() => {});
      return;
    }
    element.pause();
  };

  const handleEnded = () => {
    const element = videoRef.current;
    if (!element || !settingsRef.current.loop) return;
    element.currentTime = settingsRef.current.trimStart;
    void element.play().catch(() => {});
  };

  if (!url) return null;
  return (
    <video
      ref={videoRef}
      src={url}
      playsInline
      loop={settings.loop && settings.trimEnd === null}
      onTimeUpdate={handleTimeUpdate}
      onEnded={handleEnded}
      style={{
        width: "100%",
        height: "100%",
        objectFit: settings.fit,
        filter: buildFilter(settings),
      }}
    />
  );
}
