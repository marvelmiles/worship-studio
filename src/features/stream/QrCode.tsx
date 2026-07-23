import { useEffect, useRef } from "react";
import { drawQr } from "./lib/qr";

/** Renders a handshake string as a scannable QR code on a white tile. */
export function QrCode({
  value,
  size = 260,
}: {
  value: string;
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) drawQr(canvasRef.current, value, size);
  }, [value, size]);

  return (
    <div
      style={{
        display: "inline-flex",
        padding: 12,
        borderRadius: 14,
        background: "#ffffff",
        boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: size,
          height: size,
          imageRendering: "pixelated",
          display: "block",
        }}
      />
    </div>
  );
}
