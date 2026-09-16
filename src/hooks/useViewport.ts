import { useEffect, useState } from "react";
import { BREAKPOINTS } from "../theme/breakpoints";

interface Viewport {
  width: number;
  isMobile: boolean;
  isTablet: boolean;
}

const read = (): Viewport => {
  const width = typeof window === "undefined" ? 1280 : window.innerWidth;
  return {
    width,
    isMobile: width <= BREAKPOINTS.mobile,
    isTablet: width <= BREAKPOINTS.tablet,
  };
};

export const useViewport = (): Viewport => {
  const [viewport, setViewport] = useState<Viewport>(read);

  useEffect(() => {
    let frame = 0;
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setViewport(read()));
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return viewport;
};
