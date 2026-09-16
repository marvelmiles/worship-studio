import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

export interface FloatingWindowPosition {
  x: number;
  y: number;
}

interface FloatingWindowOptions {
  width: number;
  margin?: number;
  estimatedHeight?: number;
  offsetIndex?: number;
  elementRef?: RefObject<HTMLDivElement>;
}

interface FloatingWindow {
  ref: RefObject<HTMLDivElement>;
  position: FloatingWindowPosition;
  dragging: boolean;
  handleProps: {
    onPointerDown: (event: ReactPointerEvent) => void;
    onPointerMove: (event: ReactPointerEvent) => void;
    onPointerUp: () => void;
    onPointerCancel: () => void;
    style: CSSProperties;
  };
}

const CASCADE = 26;

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
  const grab = useRef<{ dx: number; dy: number } | null>(null);

  const measuredHeight = useCallback(
    () => ref.current?.offsetHeight ?? estimatedHeight,
    [ref, estimatedHeight],
  );

  useEffect(() => {
    const onResize = () =>
      setPosition((current) => ({
        x: Math.min(
          current.x,
          Math.max(margin, window.innerWidth - width - margin),
        ),
        y: Math.min(
          current.y,
          Math.max(margin, window.innerHeight - measuredHeight() - margin),
        ),
      }));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [margin, width, measuredHeight]);

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

  const onPointerMove = useCallback(
    (event: ReactPointerEvent) => {
      const offset = grab.current;
      if (!offset) return;
      setPosition({
        x: Math.max(
          0,
          Math.min(window.innerWidth - width, event.clientX - offset.dx),
        ),
        y: Math.max(
          0,
          Math.min(
            window.innerHeight - measuredHeight(),
            event.clientY - offset.dy,
          ),
        ),
      });
    },
    [width, measuredHeight],
  );

  const endDrag = useCallback(() => {
    grab.current = null;
    setDragging(false);
  }, []);

  return {
    ref,
    position,
    dragging,
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      style: { cursor: dragging ? "grabbing" : "grab", touchAction: "none" },
    },
  };
};
