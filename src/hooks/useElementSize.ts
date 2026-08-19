import { useLayoutEffect, useState } from "react";
import type { RefObject } from "react";

export interface ElementSize {
  width: number;
  height: number;
}

const ZERO: ElementSize = { width: 0, height: 0 };

/**
 * The rendered size of an element, kept current as its box changes.
 *
 * Used where a layout has to be computed from the box rather than described to
 * it, which CSS alone cannot express: a picture turned a quarter turn has to be
 * given the box's height as its width before being rotated back over it.
 *
 * Zero until the first measurement, so callers fall back to a layout that needs
 * no measuring for that first paint.
 */
export function useElementSize(ref: RefObject<HTMLElement>): ElementSize {
  const [size, setSize] = useState<ElementSize>(ZERO);

  // Measured before the browser paints, so a layout computed from the box is
  // right on the first frame rather than correcting itself on the second.
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const measure = () => {
      const { clientWidth, clientHeight } = element;
      setSize((current) =>
        current.width === clientWidth && current.height === clientHeight
          ? current
          : { width: clientWidth, height: clientHeight },
      );
    };

    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}
