import { useLayoutEffect, useRef } from "react";
import type { CSSProperties } from "react";

interface PortalSlotProps {
  host: HTMLElement;
  style?: CSSProperties;
}

/**
 * Where a `usePortalHost` element sits right now.
 *
 * Adopting the host before paint, in the same commit that removed it from its
 * previous slot, is what keeps a playing video from being paused by the browser
 * for having left the document.
 */
export function PortalSlot({ host, style }: PortalSlotProps) {
  const slotRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    slotRef.current?.appendChild(host);
  }, [host]);

  return (
    <div ref={slotRef} style={{ position: "absolute", inset: 0, ...style }} />
  );
}
