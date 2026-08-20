import type { CSSProperties } from "react";
import type { PipCorner, PipPlacement } from "../types";

/**
 * Where a floating window lands on the surface underneath it, in percentages so
 * one placement is right on the operator's stage, in the floating presenter and
 * on the projector at once.
 */

export const PIP_CORNERS: readonly PipCorner[] = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
];

export const PIP_CORNER_LABELS: Record<PipCorner, string> = {
  "top-left": "Top left",
  "top-right": "Top right",
  "bottom-left": "Bottom left",
  "bottom-right": "Bottom right",
};

export const PIP_SIZE_MIN = 12;
export const PIP_SIZE_MAX = 45;

export const DEFAULT_PIP_PLACEMENT: PipPlacement = {
  corner: "bottom-right",
  size: 26,
};

/**
 * The gap between the window and the edges it hugs. Two figures rather than
 * one because a top or bottom offset is measured against the surface's height
 * while a left or right offset is measured against its width: on the 16:9 box
 * everything here is painted in, the same visual gap is a different percentage
 * on each axis.
 */
const EDGE_INSET_X = 2.5;
const EDGE_INSET_Y = 4.4;

/** Space between stacked windows sharing a corner. */
const STACK_GAP = 2;

export const clampPipSize = (size: number): number =>
  Math.min(PIP_SIZE_MAX, Math.max(PIP_SIZE_MIN, Math.round(size)));

export const isPipCorner = (value: unknown): value is PipCorner =>
  typeof value === "string" && PIP_CORNERS.includes(value as PipCorner);

export function normalisePipPlacement(
  placement?: Partial<PipPlacement> | null,
): PipPlacement {
  return {
    corner: isPipCorner(placement?.corner)
      ? placement.corner
      : DEFAULT_PIP_PLACEMENT.corner,
    size: clampPipSize(placement?.size ?? DEFAULT_PIP_PLACEMENT.size),
  };
}

/**
 * The box for one window. `index` stacks windows that share a corner sideways,
 * away from the edge they hug, so a second camera never lands on top of the
 * first.
 */
export function pipFrameStyle(
  placement: PipPlacement,
  index = 0,
): CSSProperties {
  const { corner, size } = normalisePipPlacement(placement);
  const offset = EDGE_INSET_X + index * (size + STACK_GAP);
  return {
    position: "absolute",
    width: `${size}%`,
    aspectRatio: "16 / 9",
    ...(corner.startsWith("top")
      ? { top: `${EDGE_INSET_Y}%` }
      : { bottom: `${EDGE_INSET_Y}%` }),
    ...(corner.endsWith("right")
      ? { right: `${offset}%` }
      : { left: `${offset}%` }),
  };
}
