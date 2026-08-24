import qrcode from "qrcode-generator";
import jsQR from "jsqr";

/**
 * Thin wrappers over the QR libraries, kept in one place so the rest of the
 * module never imports them directly. Encoding renders the handshake string to
 * a canvas; decoding scans camera frames for the other device's reply.
 */

/**
 * Draws `text` as a QR code into `canvas`, returning the size in device pixels
 * it was rendered at, or 0 when the payload will not fit in a QR at all.
 *
 * Error-correction level "L" holds the most data per module, which matters
 * because the handshake payload is large; on a clean phone-to-screen scan the
 * extra correction buys less than the lower density does. Auto type number (0)
 * picks the smallest version that fits.
 *
 * Every module is drawn as a whole number of device pixels, and the caller sizes
 * the element to match, so no module is ever half a pixel wide. That matters
 * more than it sounds: a handshake code runs past 120 modules a side, and a
 * browser resampling it to a fractional size is the difference between a phone
 * camera resolving the modules and giving up.
 */
export function drawQr(
  canvas: HTMLCanvasElement,
  text: string,
  targetCssPx: number,
  devicePixelRatio = 1,
): number {
  const qr = qrcode(0, "L");
  // Alphanumeric mode packs ~5.5 bits per character instead of byte mode's 8,
  // producing a lower-density code for the same payload. Safe because the
  // signal encoder emits only Base45 + prefix characters, all of which are in
  // the QR alphanumeric charset.
  qr.addData(text, "Alphanumeric");
  try {
    qr.make();
  } catch {
    // Overflowed every QR version. The caller offers the paste channel instead
    // of rendering a code nothing can read.
    return 0;
  }

  const count = qr.getModuleCount();
  const quiet = 4; // Required quiet-zone margin, in modules.
  const total = count + quiet * 2;
  const scale = Math.max(1, Math.floor((targetCssPx * devicePixelRatio) / total));
  const dim = total * scale;

  canvas.width = dim;
  canvas.height = dim;
  const ctx = canvas.getContext("2d");
  if (!ctx) return 0;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, dim, dim);
  ctx.fillStyle = "#000000";
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.isDark(row, col)) {
        ctx.fillRect(
          (col + quiet) * scale,
          (row + quiet) * scale,
          scale,
          scale,
        );
      }
    }
  }
  return dim;
}

/**
 * Scans one video frame for a QR code, returning its text or null.
 *
 * Only the centred square is analysed. The scanner shows a square viewport with
 * `object-fit: cover`, so that square is exactly what the operator sees and aims
 * the code at, and sampling the same region keeps the code as large as the
 * capture allows instead of shrinking it inside the wider 16:9 frame.
 *
 * `maxSide` caps the pixels handed to the decoder. It is not only a speed lever,
 * though jsQR's cost is quadratic in the side and a slow pass means fewer
 * attempts per second: a slightly downscaled frame also averages out sensor
 * noise and screen moiré, which is often what lets a code read at all. Callers
 * alternate between a large and a small pass rather than betting on either.
 *
 * `dontInvert` stays because a QR on a bright screen is always dark-on-light,
 * and skipping the inverted pass leaves more time for more attempts.
 */
export function scanFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  maxSide?: number,
): string | null {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;

  const source = Math.min(vw, vh);
  const sx = (vw - source) / 2;
  const sy = (vh - source) / 2;
  const side = Math.round(maxSide ? Math.min(source, maxSide) : source);

  canvas.width = side;
  canvas.height = side;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(video, sx, sy, source, source, 0, 0, side, side);
  const image = ctx.getImageData(0, 0, side, side);
  const found = jsQR(image.data, side, side, {
    inversionAttempts: "dontInvert",
  });
  return found?.data ?? null;
}
