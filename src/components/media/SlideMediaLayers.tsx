import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import type { SlideMedia } from "../../types";
import { useSlideMediaFile } from "../../hooks/useSlideMediaFile";
import { buildFilter } from "../../lib/media";
import { placedImageSettings, placedVideoSettings } from "../../lib/slideMedia";
import { ImageLayer } from "./ImageLayer";

interface SlideMediaLayersProps {
  media: SlideMedia[];
  /** True on the projector: clips play rather than resting on their first frame. */
  live?: boolean;
  /**
   * The placement whose player controls are live, so a clip can be played,
   * scrubbed, muted or thrown fullscreen while the slide is being laid out.
   */
  controlsFor?: string | null;
}

const frameStyle = (
  media: SlideMedia,
  interactive: boolean,
): CSSProperties => ({
  position: "absolute",
  left: `${media.frame.x}%`,
  top: `${media.frame.y}%`,
  width: `${media.frame.width}%`,
  height: `${media.frame.height}%`,
  borderRadius: `${media.radius ?? 0}cqw`,
  overflow: "hidden",
  opacity: (media.opacity ?? 100) / 100,
  pointerEvents: interactive ? "auto" : "none",
});

/**
 * Paints the pictures and clips placed on a slide, in the order they are
 * stacked. Only a clip showing its controls takes pointer input: the editor
 * lays its own drag surface over the slide (see
 * features/editor/SlideElementOverlay), so the same layers render identically
 * in a thumbnail, the editor and the projector.
 */
export function SlideMediaLayers({
  media,
  live,
  controlsFor,
}: SlideMediaLayersProps) {
  return (
    <>
      {media.map((placed) => {
        const controls = placed.kind === "video" && placed.id === controlsFor;
        return (
          <div
            key={placed.id}
            aria-hidden={!controls}
            style={frameStyle(placed, controls)}
          >
            {placed.kind === "image" ? (
              <PlacedImage media={placed} />
            ) : (
              <PlacedVideo media={placed} live={live} controls={controls} />
            )}
          </div>
        );
      })}
    </>
  );
}

function PlacedImage({ media }: { media: SlideMedia }) {
  const file = useSlideMediaFile(media);
  return (
    <ImageLayer
      src={file.url}
      alt={file.name}
      settings={placedImageSettings(media)}
      style={{ background: "transparent" }}
    />
  );
}

/**
 * A clip in its box. On the projector it starts itself; in the editor it holds
 * its trim-start frame so the writer can see what they placed without the slide
 * turning into a playing video while they type. Selecting it hands the controls
 * over, so it can be previewed by hand before the service.
 */
function PlacedVideo({
  media,
  live,
  controls,
}: {
  media: SlideMedia;
  live?: boolean;
  controls: boolean;
}) {
  const file = useSlideMediaFile(media);
  const url = file.url;
  const videoRef = useRef<HTMLVideoElement>(null);
  const settings = placedVideoSettings(media);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Playback is driven by hand while the controls are showing, so the clip is
  // only cued and started when they are not.
  useEffect(() => {
    const element = videoRef.current;
    if (!element || !url || controls) return;
    element.currentTime = settingsRef.current.trimStart;
    element.playbackRate = settingsRef.current.playbackRate;
    if (live) void element.play().catch(() => {});
    else element.pause();
  }, [url, live, controls]);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;
    element.muted = controls || live ? settings.muted : true;
    element.volume = Math.min(1, Math.max(0, settings.volume / 100));
  }, [live, controls, settings.muted, settings.volume]);

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
      controls={controls}
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
