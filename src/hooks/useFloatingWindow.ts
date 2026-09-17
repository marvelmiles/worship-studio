import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import {
  floatingZIndex,
  raiseFloating,
  registerFloating,
  releaseFloating,
  subscribeFloatingStack,
} from "../lib/floatingStack";

export interface FloatingWindowPosition {
  x: number;
  y: number;
}

export type FloatingWindowEdge = "left" | "right" | "top" | "bottom";

interface FloatingWindowOptions {
  width: number;
  margin?: number;
  estimatedHeight?: number;
  offsetIndex?: number;
  elementRef?: RefObject<HTMLDivElement>;
}

export interface FloatingWindowStash {
  /** The edge the window is parked off, or null while it is on screen. */
  edge: FloatingWindowEdge | null;
  /** Where the tab sits along that edge, in pixels from the top or left. */
  offset: number;
  restore: () => void;
}

interface FloatingWindow {
  ref: RefObject<HTMLDivElement>;
  position: FloatingWindowPosition;
  dragging: boolean;
  stash: FloatingWindowStash;
  /** The window's place in the pop-out stack, shared with its restore tab. */
  zIndex: number;
  /** Spread onto the window's own element: its place in the stack, and the
   *  capture-phase handler that brings it to the front when touched. */
  windowProps: {
    onPointerDownCapture: () => void;
    style: CSSProperties;
  };
  handleProps: {
    onPointerDown: (event: ReactPointerEvent) => void;
    onPointerMove: (event: ReactPointerEvent) => void;
    onPointerUp: () => void;
    onPointerCancel: () => void;
    style: CSSProperties;
  };
}

const CASCADE = 26;

/** How much of the window has to hang off an edge for the drop to park it. */
const STASH_RATIO = 0.55;

/** A parked window sits fully outside, so only its tab is left to grab. */
const parkedPosition = (
  edge: FloatingWindowEdge,
  current: FloatingWindowPosition,
  width: number,
  height: number,
): FloatingWindowPosition => {
  if (edge === "left") return { ...current, x: -width };
  if (edge === "right") return { ...current, x: window.innerWidth };
  if (edge === "top") return { ...current, y: -height };
  return { ...current, y: window.innerHeight };
};

const clampInside = (
  position: FloatingWindowPosition,
  width: number,
  height: number,
  margin: number,
): FloatingWindowPosition => ({
  x: Math.max(margin, Math.min(window.innerWidth - width - margin, position.x)),
  y: Math.max(
    margin,
    Math.min(window.innerHeight - height - margin, position.y),
  ),
});

const stashEdgeFor = (
  position: FloatingWindowPosition,
  width: number,
  height: number,
): FloatingWindowEdge | null => {
  const hidden: Record<FloatingWindowEdge, number> = {
    left: -position.x / width,
    right: (position.x + width - window.innerWidth) / width,
    top: -position.y / height,
    bottom: (position.y + height - window.innerHeight) / height,
  };
  const [edge, amount] = Object.entries(hidden).sort(
    (a, b) => b[1] - a[1],
  )[0] as [FloatingWindowEdge, number];
  return amount >= STASH_RATIO ? edge : null;
};

export const useFloatingWindow = ({
  width,
  margin = 16,
  estimatedHeight = 240,
  offsetIndex = 0,
  elementRef,
}: FloatingWindowOptions): FloatingWindow => {
  const ownRef = useRef<HTMLDivElement>(null);
  const ref = elementRef ?? ownRef;
  const [position, setPosition] = useState<FloatingWindowPosition>(() => ({
    x: Math.max(
      margin,
      window.innerWidth - width - margin - offsetIndex * CASCADE,
    ),
    y: margin + offsetIndex * CASCADE,
  }));
  const [dragging, setDragging] = useState(false);
  const [edge, setEdge] = useState<FloatingWindowEdge | null>(null);
  const grab = useRef<{ dx: number; dy: number } | null>(null);
  const dragged = useRef<FloatingWindowPosition | null>(null);
  const beforeStash = useRef<FloatingWindowPosition | null>(null);

  const stackId = useId();
  const zIndex = useSyncExternalStore(subscribeFloatingStack, () =>
    floatingZIndex(stackId),
  );
  const raise = useCallback(() => raiseFloating(stackId), [stackId]);

  useEffect(() => {
    registerFloating(stackId);
    return () => releaseFloating(stackId);
  }, [stackId]);

  const measuredHeight = useCallback(
    () => ref.current?.offsetHeight ?? estimatedHeight,
    [ref, estimatedHeight],
  );

  /* A parked window stays parked through a resize; the rest are pulled back
     inside the new viewport. */
  useEffect(() => {
    const onResize = () =>
      setPosition((current) => {
        const height = measuredHeight();
        if (edge) return parkedPosition(edge, current, width, height);
        return {
          x: Math.min(
            current.x,
            Math.max(margin, window.innerWidth - width - margin),
          ),
          y: Math.min(
            current.y,
            Math.max(margin, window.innerHeight - height - margin),
          ),
        };
      });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [margin, width, measuredHeight, edge]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent) => {
      grab.current = {
        dx: event.clientX - position.x,
        dy: event.clientY - position.y,
      };
      setDragging(true);
      (event.target as HTMLElement).setPointerCapture(event.pointerId);
    },
    [position.x, position.y],
  );

  /* Dragging is free to leave the viewport on any side, which is what lets a
     window be pushed away; the drop decides whether it parks or springs back. */
  const onPointerMove = useCallback(
    (event: ReactPointerEvent) => {
      const offset = grab.current;
      if (!offset) return;
      const height = measuredHeight();
      const next = {
        x: Math.max(
          -width,
          Math.min(window.innerWidth, event.clientX - offset.dx),
        ),
        y: Math.max(
          -height,
          Math.min(window.innerHeight, event.clientY - offset.dy),
        ),
      };
      dragged.current = next;
      setPosition(next);
    },
    [width, measuredHeight],
  );

  const endDrag = useCallback(() => {
    const dropped = dragged.current;
    dragged.current = null;
    grab.current = null;
    setDragging(false);
    if (!dropped) return;

    const height = measuredHeight();
    const next = stashEdgeFor(dropped, width, height);
    setEdge(next);
    if (!next) {
      beforeStash.current = null;
      setPosition(clampInside(dropped, width, height, 0));
      return;
    }
    beforeStash.current = clampInside(dropped, width, height, margin);
    setPosition(parkedPosition(next, dropped, width, height));
  }, [margin, width, measuredHeight]);

  const restore = useCallback(() => {
    const target = beforeStash.current;
    beforeStash.current = null;
    setEdge(null);
    raise();
    setPosition((current) => target ?? { x: margin, y: current.y });
  }, [margin, raise]);

  const stashOffset =
    edge === "left" || edge === "right" ? position.y : position.x;

  return {
    ref,
    position,
    dragging,
    stash: { edge, offset: stashOffset, restore },
    zIndex,
    windowProps: {
      onPointerDownCapture: raise,
      style: { zIndex },
    },
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      style: { cursor: dragging ? "grabbing" : "grab", touchAction: "none" },
    },
  };
};
