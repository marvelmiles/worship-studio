import qrcode from "qrcode-generator";

export interface QrPalette {
  surface: string;
  ink: string;
  eye: string;
}

export type QrVersion = Parameters<typeof qrcode>[0];

const FINDER_MODULES = 7;
const QUIET_ZONE_MODULES = 4;
const MAX_QR_VERSION = 40;

const fillRoundedSquare = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  radius: number,
): void => {
  if (!radius || typeof context.roundRect !== "function") {
    context.fillRect(x, y, size, size);
    return;
  }
  context.beginPath();
  context.roundRect(x, y, size, size, radius);
  context.fill();
};

const drawFinderPattern = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  palette: QrPalette,
): void => {
  const outer = FINDER_MODULES * scale;
  context.fillStyle = palette.eye;
  fillRoundedSquare(context, x, y, outer, scale * 2);
  context.fillStyle = palette.surface;
  fillRoundedSquare(
    context,
    x + scale,
    y + scale,
    outer - scale * 2,
    scale * 1.3,
  );
  context.fillStyle = palette.eye;
  fillRoundedSquare(
    context,
    x + scale * 2,
    y + scale * 2,
    scale * 3,
    scale * 0.9,
  );
};

const isInFinderPattern = (row: number, col: number, count: number): boolean =>
  (row < FINDER_MODULES && col < FINDER_MODULES) ||
  (row < FINDER_MODULES && col >= count - FINDER_MODULES) ||
  (row >= count - FINDER_MODULES && col < FINDER_MODULES);

// The signal encoder only emits Base45 characters, so alphanumeric mode is safe and packs the most data per module.
const buildQr = (text: string, version: QrVersion) => {
  const qr = qrcode(version, "L");
  qr.addData(text, "Alphanumeric");
  try {
    qr.make();
    return qr;
  } catch {
    return null;
  }
};

export const smallestQrVersion = (text: string): QrVersion | null => {
  const qr = buildQr(text, 0);
  if (!qr) return null;
  const version = (qr.getModuleCount() - 17) / 4;
  return Math.min(MAX_QR_VERSION, version) as QrVersion;
};

// Modules are drawn as whole device pixels so the browser never resamples a dense grid.
export const drawQr = (
  canvas: HTMLCanvasElement,
  text: string,
  targetCssPx: number,
  palette: QrPalette,
  devicePixelRatio = 1,
  version: QrVersion = 0,
): number => {
  const qr = buildQr(text, version);
  if (!qr) return 0;

  const count = qr.getModuleCount();
  const totalModules = count + QUIET_ZONE_MODULES * 2;
  const scale = Math.max(
    1,
    Math.floor((targetCssPx * devicePixelRatio) / totalModules),
  );
  const dimension = totalModules * scale;

  canvas.width = dimension;
  canvas.height = dimension;
  const context = canvas.getContext("2d");
  if (!context) return 0;

  context.fillStyle = palette.surface;
  context.fillRect(0, 0, dimension, dimension);

  const offset = QUIET_ZONE_MODULES * scale;
  const moduleRadius = scale >= 4 ? scale * 0.28 : 0;
  context.fillStyle = palette.ink;
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (!qr.isDark(row, col) || isInFinderPattern(row, col, count)) continue;
      fillRoundedSquare(
        context,
        offset + col * scale,
        offset + row * scale,
        scale,
        moduleRadius,
      );
    }
  }

  const farEdge = offset + (count - FINDER_MODULES) * scale;
  drawFinderPattern(context, offset, offset, scale, palette);
  drawFinderPattern(context, farEdge, offset, scale, palette);
  drawFinderPattern(context, offset, farEdge, scale, palette);
  return dimension;
};
