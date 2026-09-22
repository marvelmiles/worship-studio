import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useStore } from "../../store/useStore";
import { useBgMap } from "../../hooks/useBgMap";
import { trimmedDuration, videoSettingsOf } from "../../lib/media";
import { SlideCanvas } from "../../components/SlideCanvas";
import { VideoSurface } from "../../components/media/VideoSurface";
import { useDeck } from "../presentation/useDeck";
import { buildStageFrame } from "../presentation/stageContent";
import { OverlayPicture } from "./OverlayPicture";
import { OverlayTextBlock } from "./OverlayTextBlock";
import { reportOverlayVideoProgress } from "./lib/overlayVideoProgress";
import {
  editedOverlay,
  isMarquee,
  isMediaKind,
  isOnAir,
  isVisible,
  type ContentOverlay,
  type MarqueeOverlay,
  type StreamOverlay,
} from "./lib/streamOverlay";

interface StreamOverlayLayersProps {
  overlays: StreamOverlay[];
  live?: boolean;
  muted?: boolean;
  showDrafts?: boolean;
  preview?: boolean;
}

export const StreamOverlayLayers = ({
  overlays,
  live,
  muted,
  showDrafts,
  preview,
}: StreamOverlayLayersProps) => {
  const visible = overlays
    .filter(
      (overlay) =>
        isVisible(overlay) && (isOnAir(overlay) || Boolean(showDrafts)),
    )
    .map((overlay) => (preview ? editedOverlay(overlay) : overlay));
  if (visible.length === 0) return null;

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        containerType: "inline-size",
      }}
    >
      {visible.map((overlay) => (
        <div key={overlay.id} style={boxStyle(overlay)}>
          {isMarquee(overlay) ? (
            <MarqueeLayer overlay={overlay} />
          ) : (
            <ContentLayer overlay={overlay} live={live} muted={muted} />
          )}
        </div>
      ))}
    </div>
  );
};

const boxStyle = (overlay: StreamOverlay): CSSProperties => ({
  position: "absolute",
  left: `${overlay.frame.x}%`,
  top: `${overlay.frame.y}%`,
  width: `${overlay.frame.width}%`,
  height: `${overlay.frame.height}%`,
  borderRadius: `${overlay.radius}cqw`,
  overflow: "hidden",
  opacity: overlay.opacity / 100,
  containerType: "size",
});

const ContentLayer = (props: {
  overlay: ContentOverlay;
  live?: boolean;
  muted?: boolean;
}) => {
  const { overlay } = props;
  if (isMediaKind(overlay.kind)) return <MediaOverlayLayer {...props} />;
  return overlay.layout === "block" ? (
    <OverlayTextBlock overlay={overlay} />
  ) : (
    <DeckOverlayLayer overlay={overlay} live={props.live} />
  );
};

const DeckOverlayLayer = ({
  overlay,
  live,
}: {
  overlay: ContentOverlay;
  live?: boolean;
}) => {
  const prefs = useStore((s) => s.prefs);
  const bgMap = useBgMap();
  const media = useStore((s) => s.media);
  const deck = useDeck(overlay.kind, overlay.contentId);
  const slide = deck?.slides[Math.max(0, overlay.slideIndex)];
  const frame =
    deck && slide
      ? buildStageFrame(deck, slide, bgMap, prefs.transition, media)
      : null;

  if (frame?.content.kind !== "text") return null;
  const { content } = frame;

  return (
    <SlideCanvas
      slide={content.slide}
      style={content.style}
      lineStyles={content.lineStyles}
      bg={content.background}
      bgImage={content.backgroundImage}
      radius={0}
      fill
      noBackground={!overlay.opaque}
      live={live}
    />
  );
};

const MediaOverlayLayer = ({
  overlay,
  live,
  muted,
}: {
  overlay: ContentOverlay;
  live?: boolean;
  muted?: boolean;
}) => {
  const media = useStore((s) => s.media);

  if (overlay.kind === "image") {
    return (
      <OverlayPicture
        image={{ id: overlay.contentId, source: overlay.source }}
      />
    );
  }

  const item = media.find(
    (entry) => entry.id === overlay.contentId && entry.kind === "video",
  );
  if (!item) return null;

  const { video } = overlay;
  const settings = videoSettingsOf(item);
  return (
    <VideoSurface
      item={item}
      settings={{
        ...settings,
        playbackRate: video.rate,
        loop: video.loop,
        volume: video.volume,
        muted: video.muted,
      }}
      playback={{
        playing: video.playing && Boolean(live),
        muted: video.muted,
        volume: video.volume,
        seekTime: settings.trimStart + video.seekTime,
        seekToken: video.seekToken,
      }}
      forceMuted={muted}
      onTimeUpdate={(time, duration) =>
        reportOverlayVideoProgress(
          overlay.id,
          Math.max(0, time - settings.trimStart),
          trimmedDuration(duration, settings) ?? 0,
        )
      }
    />
  );
};

const MarqueeLayer = ({ overlay }: { overlay: MarqueeOverlay }) => {
  const bandRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLSpanElement>(null);
  const [duration, setDuration] = useState(0);
  const { style, text, crossSeconds, fontScale } = overlay;

  useEffect(() => {
    const band = bandRef.current;
    const copy = copyRef.current;
    if (!band || !copy) return;

    const measure = () => {
      const bandWidth = band.clientWidth;
      const copyWidth = copy.offsetWidth;
      if (bandWidth <= 0 || copyWidth <= 0) return;
      setDuration((copyWidth / bandWidth) * crossSeconds);
    };

    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(band);
    observer.observe(copy);
    return () => observer.disconnect();
  }, [text, crossSeconds, fontScale, style.fontFamily, style.fontWeight]);

  return (
    <div
      ref={bandRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
        background: style.background,
      }}
    >
      {style.backgroundImage && (
        <OverlayPicture image={style.backgroundImage} fit="cover" />
      )}
      <div
        className="ws-marquee-track"
        style={{
          position: "relative",
          color: style.textColor,
          fontFamily: `'${style.fontFamily}', sans-serif`,
          fontSize: `${fontScale}cqh`,
          fontWeight: style.fontWeight,
          lineHeight: 1.1,
          animationDuration: duration > 0 ? `${duration}s` : undefined,
          animationPlayState: duration > 0 ? "running" : "paused",
        }}
      >
        <span ref={copyRef} className="ws-marquee-copy">
          {text}
        </span>
        <span className="ws-marquee-copy" aria-hidden>
          {text}
        </span>
      </div>
    </div>
  );
};
