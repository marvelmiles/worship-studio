import type { CSSProperties } from "react";
import { useStore } from "../../store/useStore";
import { useUITheme } from "../../theme/ThemeProvider";
import { useBgMap } from "../../hooks/useBgMap";
import { DEFAULT_MEDIA_PLAYBACK } from "../../lib/presentChannel";
import { SlideCanvas } from "../../components/SlideCanvas";
import { ImageSurface } from "../../components/media/ImageSurface";
import { VideoSurface } from "../../components/media/VideoSurface";
import { useDeck } from "../presentation/useDeck";
import { buildStageFrame } from "../presentation/stageContent";
import {
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
}

/**
 * Paints the overlays over a live camera broadcast.
 *
 * Deliberately presentational and shared by all four surfaces — the full-screen
 * stage, the floating PiP, the projection popup and the operator's drag surface.
 * Because every frame is in percentages and the content renders through the same
 * SlideCanvas/ImageSurface/VideoSurface primitives the projector uses, an
 * overlay placed on a 300px PiP lands in exactly the same spot on a projector.
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
}: StreamOverlayLayersProps) {
  // Hidden wins over everything: an element the operator has switched off is
  // drawn nowhere. Of the rest, a broadcast output takes only what is on air,
  // while the arranging surface also takes the drafts.
  const visible = overlays.filter(
    (overlay) =>
      isVisible(overlay) && (isOnAir(overlay) || Boolean(showDrafts)),
  );
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
  return isMediaKind(props.overlay.kind) ? (
    <MediaOverlayLayer {...props} />
  ) : (
    <DeckOverlayLayer overlay={props.overlay} live={props.live} />
  );
}

/**
 * A passage or manuscript in its box, resolved through the very same
 * useDeck/buildStageFrame pipeline the projector uses, so the theme, the
 * background settings and the per-line styling land exactly as they would on a
 * full-screen slide.
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
  const frame = deck
    ? buildStageFrame(
        deck,
        deck.slides[overlay.slideIndex],
        bgMap,
        prefs.transition,
      )
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
 * A picture or clip in its box, looked up straight from the media library
 * rather than through useDeck.
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
  const item = media.find(
    (entry) => entry.id === overlay.contentId && entry.kind === overlay.kind,
  );

  if (!item) return null;
  if (item.kind === "image") {
    return <ImageSurface item={item} style={{ background: "transparent" }} />;
  }
  return (
    <VideoSurface
      item={item}
      playback={{ ...DEFAULT_MEDIA_PLAYBACK, playing: Boolean(live) }}
      forceMuted={muted}
    />
  );
}

/**
 * A scrolling announcement band. The text is sized against the band's own height
 * rather than the broadcast's width, so an operator dragging the band taller
 * gets bigger words instead of the same words in more empty space.
 *
 * The travel is one full pass of the track's own length, so the duration the
 * operator sets is the time from entering one edge to leaving the other whatever
 * the announcement's length. A negative delay starts it already in motion, so a
 * band added mid-service doesn't open with a blank pause.
 */
function MarqueeLayer({ overlay }: { overlay: MarqueeOverlay }) {
  const { fonts, stage } = useUITheme();
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
        background: stage.overlay,
        color: stage.text,
        fontFamily: fonts.display,
        fontSize: "52cqh",
        fontWeight: 600,
        lineHeight: 1,
        borderTop: `1px solid ${stage.border}`,
      }}
    >
      <span
        className="ws-marquee-track"
        style={{
          animationDuration: `${overlay.durationSeconds}s`,
          animationDelay: `-${overlay.durationSeconds / 4}s`,
        }}
      >
        {overlay.text}
      </span>
    </div>
  );
}
