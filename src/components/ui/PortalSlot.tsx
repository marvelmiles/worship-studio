import { useLayoutEffect, useRef } from "react";
import type { CSSProperties } from "react";

interface PortalSlotProps {
  host: HTMLElement;
  style?: CSSProperties;
}

export const PortalSlot = ({ host, style }: PortalSlotProps) => {
  const slotRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    slotRef.current?.appendChild(host);
  }, [host]);

  return (
    <div ref={slotRef} style={{ position: "absolute", inset: 0, ...style }} />
  );
};
