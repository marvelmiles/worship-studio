import qrcode from "qrcode-generator";
import jsQR from "jsqr";

/**
 * Thin wrappers over the QR libraries, kept in one place so the rest of the
 * module never imports them directly. Encoding renders the handshake string to
 * a canvas; decoding scans camera frames for the other device's reply.
 */

/**
 * Draws `text` as a QR code filling `canvas`. Error-correction level "L" holds
 * the most data per module, which matters because the handshake payload is
 * large; on a clean phone-to-webcam scan the extra correction isn't needed.
 * Auto type number (0) picks the smallest version that fits.
 */
export function drawQr(canvas: HTMLCanvasElement, text: string, sizePx: number): void {
  const qr = qrcode(0, "L");
  // Alphanumeric mode packs ~5.5 bits per character instead of byte mode's 8,
  // producing a lower-density code for the same payload. Safe because the
  // signal encoder emits only Base45 + prefix characters, all of which are in
  // the QR alphanumeric charset. Byte mode would be the fallback if that ever
  // stopped holding, but it does not here.
  qr.addData(text, "Alphanumeric");
  qr.make();

  const count = qr.getModuleCount();
  const quiet = 4; // Required quiet-zone margin, in modules.
  const total = count + quiet * 2;
  const scale = Math.max(1, Math.floor(sizePx / total));
  const dim = total * scale;

  canvas.width = dim;
  canvas.height = dim;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, dim, dim);
  ctx.fillStyle = "#000000";
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.isDark(row, col)) {
        ctx.fillRect((col + quiet) * scale, (row + quiet) * scale, scale, scale);
      }
    }
  }
}

/** Scans one video frame for a QR code, returning its text or null. */
export function scanFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): string | null {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;

  // Analyse only the centred square. The scanner shows a square viewport with
  // `object-fit: cover`, so that square is exactly what the operator sees and
  // aims the code at; sampling the same region keeps the code at full capture
  // resolution instead of shrinking it inside the wider 16:9 frame — and it is
  // less work for jsQR, which raises the scan rate. dontInvert stays because a
  // QR on a bright phone screen is always dark-on-light, and skipping the
  // inverted pass leaves more time for more attempts.
  const side = Math.min(vw, vh);
  const sx = (vw - side) / 2;
  const sy = (vh - side) / 2;

  canvas.width = side;
  canvas.height = side;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(video, sx, sy, side, side, 0, 0, side, side);
  const image = ctx.getImageData(0, 0, side, side);
  const found = jsQR(image.data, side, side, { inversionAttempts: "dontInvert" });
  return found?.data ?? null;
}
