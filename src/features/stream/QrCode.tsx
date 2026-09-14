import { useEffect, useRef, useState } from "react";
import { ScanLine } from "lucide-react";
import { fade } from "../../theme/uiTheme";
import { useUITheme } from "../../theme/ThemeProvider";
import { drawQr } from "./lib/qr";

/**
 * Renders a handshake string as a scannable QR code on a light card, with the
 * corner finder patterns rounded and tinted so the code reads as a designed
 * pairing card rather than raw noise.
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
  const { colors, fonts, qr, shadows } = useUITheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [renderedCssPx, setRenderedCssPx] = useState(size);
  const [tooLarge, setTooLarge] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const drawn = drawQr(canvas, value, size, qr, ratio);
    setTooLarge(drawn === 0);
    if (drawn > 0) setRenderedCssPx(drawn / ratio);
  }, [value, size, qr]);

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
    <figure
      style={{
        margin: 0,
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "10px 10px 12px",
        borderRadius: 22,
        background: qr.surface,
        border: `1px solid ${fade(colors.accent, 0.35)}`,
        boxShadow: `0 0 0 5px ${fade(colors.accent, 0.1)}, ${shadows.overlay}`,
      }}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Pairing QR code"
        style={{
          width: renderedCssPx,
          height: renderedCssPx,
          imageRendering: "pixelated",
          display: "block",
          borderRadius: 12,
        }}
      />
      <figcaption
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          marginTop: 4,
          fontFamily: fonts.ui,
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: 0.2,
          color: qr.eye,
        }}
      >
        <ScanLine size={15} aria-hidden />
        Scan to pair
      </figcaption>
    </figure>
  );
}
