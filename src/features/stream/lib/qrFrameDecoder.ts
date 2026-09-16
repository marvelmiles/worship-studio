import type { QrDecodeRequest, QrDecodeResponse } from "./qrDecoderProtocol";

interface ScanRegion {
  crop: "fullFrame" | "centerSquare";
  maxSide: number;
}

// Full-frame passes find a code anywhere the camera sees it, not only inside the aiming box.
const SCAN_REGIONS: readonly ScanRegion[] = [
  { crop: "fullFrame", maxSide: 1280 },
  { crop: "centerSquare", maxSide: 960 },
  { crop: "fullFrame", maxSide: 800 },
];

interface DetectedBarcode {
  rawValue: string;
}

interface NativeBarcodeDetector {
  detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]>;
}

interface NativeBarcodeDetectorConstructor {
  new (options: { formats: string[] }): NativeBarcodeDetector;
  getSupportedFormats: () => Promise<string[]>;
}

const createNativeDetector =
  async (): Promise<NativeBarcodeDetector | null> => {
    const Detector = (
      globalThis as { BarcodeDetector?: NativeBarcodeDetectorConstructor }
    ).BarcodeDetector;
    if (!Detector) return null;
    try {
      const formats = await Detector.getSupportedFormats();
      return formats.includes("qr_code")
        ? new Detector({ formats: ["qr_code"] })
        : null;
    } catch {
      return null;
    }
  };

const captureRegion = (
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  region: ScanRegion,
): ImageData | null => {
  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;
  if (!videoWidth || !videoHeight) return null;

  const squareSide = Math.min(videoWidth, videoHeight);
  const source =
    region.crop === "centerSquare"
      ? {
          x: (videoWidth - squareSide) / 2,
          y: (videoHeight - squareSide) / 2,
          width: squareSide,
          height: squareSide,
        }
      : { x: 0, y: 0, width: videoWidth, height: videoHeight };

  const scale = Math.min(
    1,
    region.maxSide / Math.max(source.width, source.height),
  );
  const width = Math.round(source.width * scale);
  const height = Math.round(source.height * scale);

  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(
    video,
    source.x,
    source.y,
    source.width,
    source.height,
    0,
    0,
    width,
    height,
  );
  return context.getImageData(0, 0, width, height);
};

export interface QrFrameDecoder {
  decode: (video: HTMLVideoElement) => Promise<string[]>;
  dispose: () => void;
}

export const createQrFrameDecoder = (): QrFrameDecoder => {
  const worker = new Worker(new URL("./qrDecoder.worker.ts", import.meta.url), {
    type: "module",
  });
  const canvas = document.createElement("canvas");
  const pending = new Map<number, (text: string | null) => void>();
  const nativeDetector = createNativeDetector();
  let requestId = 0;
  let passIndex = 0;

  worker.onmessage = ({ data }: MessageEvent<QrDecodeResponse>) => {
    pending.get(data.id)?.(data.text);
    pending.delete(data.id);
  };

  const decodeInWorker = (image: ImageData): Promise<string | null> =>
    new Promise((resolve) => {
      requestId += 1;
      const request: QrDecodeRequest = {
        id: requestId,
        width: image.width,
        height: image.height,
        pixels: image.data.buffer,
      };
      pending.set(request.id, resolve);
      worker.postMessage(request, [request.pixels]);
    });

  const decodeNatively = async (
    video: HTMLVideoElement,
  ): Promise<string[] | null> => {
    const detector = await nativeDetector;
    if (!detector) return null;
    try {
      const barcodes = await detector.detect(video);
      return barcodes.map((barcode) => barcode.rawValue).filter(Boolean);
    } catch {
      return null;
    }
  };

  // Native detection (where available) alternates with jsQR passes, since each reads codes the other misses.
  const decode = async (video: HTMLVideoElement): Promise<string[]> => {
    passIndex += 1;
    if (passIndex % 2 === 0) {
      const nativeResults = await decodeNatively(video);
      if (nativeResults) return nativeResults;
    }
    const region = SCAN_REGIONS[passIndex % SCAN_REGIONS.length];
    const image = captureRegion(video, canvas, region);
    if (!image) return [];
    const text = await decodeInWorker(image);
    return text ? [text] : [];
  };

  const dispose = () => {
    worker.terminate();
    for (const resolve of pending.values()) resolve(null);
    pending.clear();
  };

  return { decode, dispose };
};
