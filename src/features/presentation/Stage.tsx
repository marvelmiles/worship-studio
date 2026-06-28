import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { CSSProperties } from "react";
import type { AnimationKind, Background, EasingKind, PresentationView, ResolvedStyle, Slide } from "../../types";
import { ANIMATION_VARIANTS, buildTransition } from "../../lib/animation";
import { SlideCanvas } from "../../components/SlideCanvas";

interface StageProps {
  idx: number;
  slide: Slide;
  style: ResolvedStyle;
  lineStyles?: ResolvedStyle[];
  background: Background;
  animation: AnimationKind;
  view: PresentationView;
  zoom: number;
  pan: { x: number; y: number };
  onPanBy: (dx: number, dy: number) => void;
  durationMs: number;
  easing: EasingKind;
}

function viewSize(view: PresentationView): CSSProperties {
  if (view === "fill") return { width: "100vw", height: "100vh" };
  if (view === "cover") return { width: "max(100vw,177.78vh)", height: "max(100vh,56.25vw)" };
  return { width: "min(100vw,177.78vh)", height: "min(100vh,56.25vw)" };
}

function resolveBgStyle(background: Background): CSSProperties {
  if (background?.type === "image") {
    return {
      backgroundImage: `url(${background.dataUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }
  if (background?.type === "solid") return { background: background.color };
  return { background: background?.css || "#000" };
}

export function Stage({
  idx,
  slide,
  style,
  lineStyles,
  background,
  animation,
  view,
  zoom,
  pan,
  onPanBy,
  durationMs,
  easing,
}: StageProps) {
  const variant = ANIMATION_VARIANTS[animation] || ANIMATION_VARIANTS.fade;
  const transition = buildTransition(durationMs, easing);

  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const [grabbing, setGrabbing] = useState(false);

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
        ...resolveBgStyle(background),
        overflow: "hidden",
        display: "grid",
        placeItems: "center",
        cursor: grabbing ? "grabbing" : "grab",
        touchAction: "none",
        userSelect: "none",
      }}
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={idx}
          initial={variant.initial}
          animate={variant.animate}
          exit={{ opacity: 0 }}
          transition={transition}
          style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}
        >
          <div
            style={{
              ...viewSize(view),
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "center",
            }}
          >
            <SlideCanvas
              slide={slide}
              style={style}
              lineStyles={lineStyles}
              bg={background}
              scrim={slide.overrides?.scrim}
              radius={0}
              fill
              noBackground
            />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
