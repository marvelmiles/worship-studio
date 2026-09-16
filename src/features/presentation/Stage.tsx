import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { CSSProperties, Ref } from "react";
import type {
  AnimationKind,
  Background,
  EasingKind,
  PresentationView,
} from "../../types";
import type { MediaPlayback } from "../../lib/presentChannel";
import { ANIMATION_VARIANTS, buildTransition } from "../../lib/animation";
import { useBlobUrl } from "../../lib/blobUrls";
import { isMediaBackground } from "../../lib/media";
import { SlideCanvas } from "../../components/SlideCanvas";
import { PortalSlot } from "../../components/ui/PortalSlot";
import { BackgroundSurface } from "../../components/media/BackgroundSurface";
import { ImageSurface } from "../../components/media/ImageSurface";
import {
  VideoSurface,
  type VideoSurfaceHandle,
} from "../../components/media/VideoSurface";
import type { StageContent } from "./stageContent";

interface StageProps {
  slideIndex: number;
  content: StageContent;
  animation: AnimationKind;
  view: PresentationView;
  zoom: number;
  pan: { x: number; y: number };
  onPanBy: (dx: number, dy: number) => void;
  durationMs: number;
  easing: EasingKind;
  playback?: MediaPlayback;
  forceMutedVideo?: boolean;
  videoRef?: Ref<VideoSurfaceHandle>;
  onVideoTime?: (time: number, duration: number) => void;
  onVideoEnded?: () => void;
  videoHost?: HTMLElement | null;
}

const viewSize = (view: PresentationView): CSSProperties => {
  if (view === "fill") return { width: "100vw", height: "100vh" };
  if (view === "cover")
    return { width: "max(100vw,177.78vh)", height: "max(100vh,56.25vw)" };
  return { width: "min(100vw,177.78vh)", height: "min(100vh,56.25vw)" };
};

const backdropLayerStyle = (
  background: Background | null,
  ambientUrl: string | null,
): CSSProperties => {
  if (background) return resolveBgStyle(background);
  if (ambientUrl) {
    return {
      backgroundImage: `url(${ambientUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundColor: "#000",
      filter: "blur(48px) brightness(0.55) saturate(1.1)",
      transform: "scale(1.12)",
    };
  }
  return { background: "#000" };
};

const resolveBgStyle = (background: Background | null): CSSProperties => {
  if (!background) return { background: "#000" };
  if (background.type === "image" || background.type === "video")
    return { background: "#000" };
  if (background.type === "solid") return { background: background.color };
  return { background: background.css || "#000" };
};

export const Stage = ({
  slideIndex,
  content,
  animation,
  view,
  zoom,
  pan,
  onPanBy,
  durationMs,
  easing,
  playback,
  forceMutedVideo,
  videoRef,
  onVideoTime,
  onVideoEnded,
  videoHost,
}: StageProps) => {
  const variant = ANIMATION_VARIANTS[animation] || ANIMATION_VARIANTS.fade;
  const transition = buildTransition(durationMs, easing);

  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const [grabbing, setGrabbing] = useState(false);

  const backdrop = content.kind === "text" ? content.background : null;
  const backdropImage =
    content.kind === "text" ? content.backgroundImage : null;
  const ambientUrl = useBlobUrl(
    content.kind === "image" ? content.item.id : null,
  );

  return (
    <div
      onPointerDown={(e) => {
        dragging.current = true;
        last.current = { x: e.clientX, y: e.clientY };
        setGrabbing(true);
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!dragging.current) return;
        onPanBy(e.clientX - last.current.x, e.clientY - last.current.y);
        last.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={() => {
        dragging.current = false;
        setGrabbing(false);
      }}
      onPointerCancel={() => {
        dragging.current = false;
        setGrabbing(false);
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        overflow: "hidden",
        display: "grid",
        placeItems: "center",
        cursor: grabbing ? "grabbing" : "grab",
        touchAction: "none",
        userSelect: "none",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          ...backdropLayerStyle(backdrop, ambientUrl),
        }}
      >
        {isMediaBackground(backdrop ?? undefined) && (
          <BackgroundSurface
            background={backdrop ?? undefined}
            settings={backdropImage}
          />
        )}
      </div>

      <AnimatePresence initial={false}>
        <motion.div
          key={slideIndex}
          initial={variant.initial}
          animate={variant.animate}
          exit={{ opacity: 0 }}
          transition={transition}
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              ...viewSize(view),
              position: "relative",
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "center",
            }}
          >
            {content.kind === "text" && (
              <SlideCanvas
                slide={content.slide}
                style={content.style}
                lineStyles={content.lineStyles}
                bg={content.background}
                radius={0}
                fill
                noBackground
                live
              />
            )}
            {content.kind === "image" && (
              <ImageSurface
                item={content.item}
                style={{ background: "transparent" }}
              />
            )}
            {content.kind === "video" &&
              (videoHost ? (
                <PortalSlot
                  host={videoHost}
                  style={{ pointerEvents: "auto" }}
                />
              ) : (
                <VideoSurface
                  ref={videoRef}
                  item={content.item}
                  playback={playback}
                  forceMuted={forceMutedVideo}
                  onTimeUpdate={onVideoTime}
                  onEnded={onVideoEnded}
                  style={{ pointerEvents: "auto" }}
                />
              ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
