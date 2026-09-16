import { useLayoutEffect, useState } from "react";
import type { RefObject } from "react";

export interface ElementSize {
  width: number;
  height: number;
}

const ZERO: ElementSize = { width: 0, height: 0 };

export const useElementSize = (ref: RefObject<HTMLElement>): ElementSize => {
  const [size, setSize] = useState<ElementSize>(ZERO);

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
};
