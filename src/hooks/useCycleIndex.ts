import { useEffect, useState } from "react";

export const useCycleIndex = (length: number, intervalMs: number): number => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (length <= 1) return;
    const timer = window.setInterval(
      () => setIndex((current) => (current + 1) % length),
      intervalMs,
    );
    return () => window.clearInterval(timer);
  }, [length, intervalMs]);

  return length > 0 ? index % length : 0;
};
