import qrcode from "qrcode-generator";
import jsQR from "jsqr";

/**
 * Thin wrappers over the QR libraries, kept in one place so the rest of the
 * module never imports them directly. Encoding renders the handshake string to
 * a canvas; decoding scans camera frames for the other device's reply.
 */

export interface QrPalette {
  surface: string;
  ink: string;
  /** The three corner finder patterns. */
  eye: string;
}

/** Side of a finder pattern, in modules. */
const FINDER = 7;
/** Required quiet-zone margin, in modules. */
const QUIET_ZONE = 4;

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  radius: number,
): void {
  // Engines without roundRect (Safari before 16) still get a scannable code.
  if (!radius || typeof ctx.roundRect !== "function") {
    ctx.fillRect(x, y, size, size);
    return;
  }
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, radius);
  ctx.fill();
}

/**
 * A finder pattern drawn as a rounded ring around a rounded core. The 1:1:3:1:1
 * dark-light-dark proportions scanners look for are kept exactly; only the
 * corners are softened.
 */
function drawEye(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  palette: QrPalette,
): void {
  const outer = FINDER * scale;
  ctx.fillStyle = palette.eye;
  roundedRect(ctx, x, y, outer, scale * 2);
  ctx.fillStyle = palette.surface;
  roundedRect(ctx, x + scale, y + scale, outer - scale * 2, scale * 1.3);
  ctx.fillStyle = palette.eye;
  roundedRect(ctx, x + scale * 2, y + scale * 2, scale * 3, scale * 0.9);
}

const inFinder = (row: number, col: number, count: number): boolean =>
  (row < FINDER && col < FINDER) ||
  (row < FINDER && col >= count - FINDER) ||
  (row >= count - FINDER && col < FINDER);

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
 *
 * Modules are only rounded once they are big enough for the rounding to show;
 * on a small grid it would blur module edges without making the code any softer.
 */
export function drawQr(
  canvas: HTMLCanvasElement,
  text: string,
  targetCssPx: number,
  palette: QrPalette,
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
  const total = count + QUIET_ZONE * 2;
  const scale = Math.max(
    1,
    Math.floor((targetCssPx * devicePixelRatio) / total),
  );
  const dim = total * scale;

  canvas.width = dim;
  canvas.height = dim;
  const ctx = canvas.getContext("2d");
  if (!ctx) return 0;

  ctx.fillStyle = palette.surface;
  ctx.fillRect(0, 0, dim, dim);

  const offset = QUIET_ZONE * scale;
  const moduleRadius = scale >= 4 ? scale * 0.28 : 0;
  ctx.fillStyle = palette.ink;
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (!qr.isDark(row, col) || inFinder(row, col, count)) continue;
      const x = offset + col * scale;
      const y = offset + row * scale;
      roundedRect(ctx, x, y, scale, moduleRadius);
    }
  }

  const far = offset + (count - FINDER) * scale;
  drawEye(ctx, offset, offset, scale, palette);
  drawEye(ctx, far, offset, scale, palette);
  drawEye(ctx, offset, far, scale, palette);
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
