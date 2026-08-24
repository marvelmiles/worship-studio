import { useEffect, useRef, useState } from "react";
import { useUITheme } from "../../theme/ThemeProvider";
import { drawQr } from "./lib/qr";

/**
 * Renders a handshake string as a scannable QR code on a white tile.
 *
 * The tile takes whatever size the drawing settled on rather than the one it
 * asked for. A QR is a grid of whole modules, so the crispest code is the one
 * whose modules are a whole number of device pixels; the element is then sized
 * to exactly that, and the browser never resamples the grid.
 */
export function QrCode({
  value,
  size = 300,
}: {
  value: string;
  size?: number;
}) {
  const { colors, fonts } = useUITheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [renderedCssPx, setRenderedCssPx] = useState(size);
  const [tooLarge, setTooLarge] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const drawn = drawQr(canvas, value, size, ratio);
    setTooLarge(drawn === 0);
    if (drawn > 0) setRenderedCssPx(drawn / ratio);
  }, [value, size]);

  if (tooLarge) {
    return (
      <p
        style={{
          fontFamily: fonts.ui,
          fontSize: 13,
          lineHeight: 1.5,
          color: colors.danger,
          textAlign: "center",
          maxWidth: 300,
          margin: 0,
        }}
      >
        This code is too long to show as a QR. Copy it and send it to the other
        device instead.
      </p>
    );
  }

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
          width: renderedCssPx,
          height: renderedCssPx,
          imageRendering: "pixelated",
          display: "block",
        }}
      />
    </div>
  );
}
