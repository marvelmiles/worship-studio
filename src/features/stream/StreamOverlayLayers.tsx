import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useStore } from "../../store/useStore";
import { useBgMap } from "../../hooks/useBgMap";
import { videoSettingsOf } from "../../lib/media";
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
  /**
   * True where the broadcast is actually being watched: clips play rather than
   * resting on their first frame. False in a thumbnail-sized preview.
   */
  live?: boolean;
  /**
   * Silences overlay clips. The stage, the PiP and the projector can all be
   * painting the same overlay at once, and only one of them should be heard —
   * the same rule the camera's own audio follows.
   */
  muted?: boolean;
  /**
   * Also paint the overlays that are staged but not on air.
   *
   * Only the operator's arranging surface sets this, and only while the overlay
   * controls are open. Every real broadcast output leaves it off, which is what
   * guarantees the room never watches a passage being dragged into place. A
   * draft is drawn exactly as it will look live, because that is the whole
   * point of arranging it first; what marks it as off air is the editor's own
   * layer above (see StreamOverlayEditor).
   */
  showDrafts?: boolean;
  /**
   * Draw live overlays with the edits the operator has staged but not applied.
   *
   * Set on the operator's own copies of the broadcast — the stage monitor and
   * the floating PiP — so what they are adjusting is visible as they adjust it.
   * Never set on the projection window, which is the room's copy and must keep
   * showing the last applied version until Apply now is pressed.
   */
  preview?: boolean;
}

/**
 * Paints the overlays over a live camera broadcast.
 *
 * Deliberately presentational and shared by all four surfaces — the full-screen
 * stage, the floating PiP, the projection popup and the operator's drag surface.
 * Because every frame is in percentages and the content renders through the same
 * primitives the projector uses, an overlay placed on a 300px PiP lands in
 * exactly the same spot on a projector.
 *
 * Nothing here knows about editing: the operator's drag handles are a separate
 * layer above (see StreamOverlayEditor), which is what keeps the projected
 * output identical to what the operator is arranging.
 */
export function StreamOverlayLayers({
  overlays,
  live,
  muted,
  showDrafts,
  preview,
}: StreamOverlayLayersProps) {
  // Hidden wins over everything: an element the operator has switched off is
  // drawn nowhere. Of the rest, a broadcast output takes only what is on air,
  // while the arranging surface also takes the drafts.
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
        // The layers establish their own container, so a host only has to be
        // positioned: every cqw below resolves against the broadcast's width
        // whether that is a 300px PiP or a projector.
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
}

const boxStyle = (overlay: StreamOverlay): CSSProperties => ({
  position: "absolute",
  left: `${overlay.frame.x}%`,
  top: `${overlay.frame.y}%`,
  width: `${overlay.frame.width}%`,
  height: `${overlay.frame.height}%`,
  borderRadius: `${overlay.radius}cqw`,
  overflow: "hidden",
  opacity: overlay.opacity / 100,
  // Sized container units let the content inside scale with the box rather than
  // with the broadcast, so a band stays proportioned as it is resized.
  containerType: "size",
});

/** Routes a library overlay to the renderer its kind actually needs. */
function ContentLayer(props: {
  overlay: ContentOverlay;
  live?: boolean;
  muted?: boolean;
}) {
  const { overlay } = props;
  if (isMediaKind(overlay.kind)) return <MediaOverlayLayer {...props} />;
  return overlay.layout === "block" ? (
    <OverlayTextBlock overlay={overlay} />
  ) : (
    <DeckOverlayLayer overlay={overlay} live={props.live} />
  );
}

/**
 * A passage or manuscript shown as the projector would show it, resolved
 * through the very same useDeck/buildStageFrame pipeline, so the theme, the
 * background settings and the per-line styling land exactly as they would on a
 * full-screen slide.
 *
 * The alternative to the broadcast's own block layout (see OverlayTextBlock),
 * for the case where the document's design is the point rather than the words.
 */
function DeckOverlayLayer({
  overlay,
  live,
}: {
  overlay: ContentOverlay;
  live?: boolean;
}) {
  const prefs = useStore((s) => s.prefs);
  const bgMap = useBgMap();
  const deck = useDeck(overlay.kind, overlay.contentId);
  const slide = deck?.slides[Math.max(0, overlay.slideIndex)];
  const frame =
    deck && slide
      ? buildStageFrame(deck, slide, bgMap, prefs.transition)
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
      // A transparent overlay floats the words straight on the camera; an
      // opaque one paints the slide's own background behind them, which is
      // what keeps a passage readable over a moving picture.
      noBackground={!overlay.opaque}
      live={live}
    />
  );
}

/**
 * A picture or clip in its box, looked up straight from the library that holds
 * it rather than through useDeck.
 *
 * useDeck deliberately turns "present this picture" into a slideshow over the
 * whole picture library, which is right for the projector's next/previous keys
 * and wrong here. An overlay shows the one file the operator placed, and that
 * file's position in a recency-sorted library moves every time anything else is
 * uploaded — so a stored index would silently start showing a different
 * picture.
 */
function MediaOverlayLayer({
  overlay,
  live,
  muted,
}: {
  overlay: ContentOverlay;
  live?: boolean;
  muted?: boolean;
}) {
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
  return (
    <VideoSurface
      item={item}
      // The operator's controls win over whatever the library stored, so a clip
      // slowed down or set looping for the broadcast stays that way here
      // without the media library being edited mid-service.
      settings={{
        ...videoSettingsOf(item),
        playbackRate: video.rate,
        loop: video.loop,
        volume: video.volume,
        muted: video.muted,
      }}
      playback={{
        playing: video.playing && Boolean(live),
        muted: video.muted,
        volume: video.volume,
        seekTime: video.seekTime,
        seekToken: video.seekToken,
      }}
      forceMuted={muted}
      onTimeUpdate={(time, duration) =>
        reportOverlayVideoProgress(overlay.id, time, duration)
      }
    />
  );
}

/**
 * A scrolling announcement band.
 *
 * The track carries two copies of the text and travels exactly one copy's
 * width, so the moment the first copy leaves the band the second is where it
 * started: an unbroken loop rather than a pass followed by a wait.
 *
 * Speed is held as the time a word takes to cross the band, not as the time for
 * one pass, so a two-word notice and a full paragraph scroll at the same pace.
 * Turning that into a CSS duration needs the two widths the browser only knows
 * once it has laid the text out, which is what the measuring below is for.
 */
function MarqueeLayer({ overlay }: { overlay: MarqueeOverlay }) {
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
      // One band width per crossSeconds is the speed; the track has to cover a
      // whole copy, so it takes that many band widths' worth of time.
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
          // Nothing measured yet: hold still rather than flash past at whatever
          // the default duration would be.
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
}
