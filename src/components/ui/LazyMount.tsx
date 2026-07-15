import { useEffect, useRef, useState, type ReactNode } from "react";

interface LazyMountProps {
  children: ReactNode;
  /** Rendered while off-screen; defaults to nothing (container keeps its size). */
  placeholder?: ReactNode;
  rootMargin?: string;
}

/**
 * Mounts children only while the container is near the viewport and unmounts
 * them again once it scrolls well away — so long media grids only hold object
 * URLs and decoded frames for what's actually visible.
 */
export function LazyMount({ children, placeholder, rootMargin = "400px" }: LazyMountProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (observed) => {
        for (const observedEntry of observed) setVisible(observedEntry.isIntersecting);
      },
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <div ref={ref} style={{ width: "100%", height: "100%" }}>
      {visible ? children : placeholder}
    </div>
  );
}
