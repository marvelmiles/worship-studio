import { useEffect, useRef, useState } from "react";
import { ScanLine } from "lucide-react";
import { fade } from "../../theme/uiTheme";
import { useUITheme } from "../../theme/ThemeProvider";
import { drawQr, type QrVersion } from "./lib/qr";

interface QrCodeProps {
  value: string;
  size?: number;
  version?: QrVersion;
  caption?: string;
}

export const QrCode = ({
  value,
  size = 300,
  version,
  caption = "Scan to pair",
}: QrCodeProps) => {
  const { colors, fonts, qr, shadows } = useUITheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [renderedCssPx, setRenderedCssPx] = useState(size);
  const [isTooLarge, setIsTooLarge] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const drawnPx = drawQr(canvas, value, size, qr, ratio, version);
    setIsTooLarge(drawnPx === 0);
    if (drawnPx > 0) setRenderedCssPx(drawnPx / ratio);
  }, [value, size, qr, version]);

  if (isTooLarge) {
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
        {caption}
      </figcaption>
    </figure>
  );
};
