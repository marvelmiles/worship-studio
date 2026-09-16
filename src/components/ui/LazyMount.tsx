import { useEffect, useRef, useState, type ReactNode } from "react";

interface LazyMountProps {
  children: ReactNode;
  placeholder?: ReactNode;
  rootMargin?: string;
}

export const LazyMount = ({
  children,
  placeholder,
  rootMargin = "400px",
}: LazyMountProps) => {
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
        for (const observedEntry of observed)
          setVisible(observedEntry.isIntersecting);
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <div ref={ref} style={{ width: "100%", height: "100%" }}>
      {visible ? children : placeholder}
    </div>
  );
};
