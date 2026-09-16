import jsQR from "jsqr";
import type { QrDecodeRequest, QrDecodeResponse } from "./qrDecoderProtocol";

interface DecoderWorkerScope {
  onmessage: ((event: MessageEvent<QrDecodeRequest>) => void) | null;
  postMessage: (message: QrDecodeResponse) => void;
}

const workerScope = self as unknown as DecoderWorkerScope;

workerScope.onmessage = ({ data }) => {
  const pixels = new Uint8ClampedArray(data.pixels);
  const found = jsQR(pixels, data.width, data.height, {
    inversionAttempts: "dontInvert",
  });
  workerScope.postMessage({ id: data.id, text: found?.data ?? null });
};
