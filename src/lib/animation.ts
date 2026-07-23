import type { Target, Transition } from "framer-motion";
import type { AnimationKind, EasingKind } from "../types";

export const ANIMATION_OPTIONS: { value: AnimationKind; label: string }[] = [
  { value: "fade", label: "Fade" },
  { value: "crossfade", label: "Cross Fade" },
  { value: "dissolve", label: "Dissolve" },
  { value: "zoom", label: "Zoom" },
  { value: "slide-left", label: "Slide Left" },
  { value: "slide-right", label: "Slide Right" },
  { value: "slide-up", label: "Slide Up" },
  { value: "slide-down", label: "Slide Down" },
];

/** Enter-animation keyframes per animation kind (initial -> animate). */
export const ANIMATION_VARIANTS: Record<
  AnimationKind,
  { initial: Target; animate: Target }
> = {
  fade: { initial: { opacity: 0 }, animate: { opacity: 1 } },
  crossfade: { initial: { opacity: 0 }, animate: { opacity: 1 } },
  dissolve: {
    initial: { opacity: 0, filter: "blur(10px)" },
    animate: { opacity: 1, filter: "blur(0px)" },
  },
  zoom: {
    initial: { opacity: 0, scale: 1.07 },
    animate: { opacity: 1, scale: 1 },
  },
  "slide-left": {
    initial: { opacity: 0, x: "7%" },
    animate: { opacity: 1, x: 0 },
  },
  "slide-right": {
    initial: { opacity: 0, x: "-7%" },
    animate: { opacity: 1, x: 0 },
  },
  "slide-up": {
    initial: { opacity: 0, y: "7%" },
    animate: { opacity: 1, y: 0 },
  },
  "slide-down": {
    initial: { opacity: 0, y: "-7%" },
    animate: { opacity: 1, y: 0 },
  },
};

const EASE_MAP: Record<EasingKind, "easeInOut" | "easeOut" | "linear"> = {
  ease: "easeInOut",
  "ease-in-out": "easeInOut",
  "ease-out": "easeOut",
  linear: "linear",
};

export function buildTransition(
  durationMs: number,
  easing: EasingKind,
): Transition {
  return { duration: durationMs / 1000, ease: EASE_MAP[easing] || "easeInOut" };
}
