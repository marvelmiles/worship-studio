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
  qr.addData(text);
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
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return null;

  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, w, h);
  const image = ctx.getImageData(0, 0, w, h);
  const found = jsQR(image.data, w, h, { inversionAttempts: "dontInvert" });
  return found?.data ?? null;
}
