export interface QrDecodeRequest {
  id: number;
  width: number;
  height: number;
  pixels: ArrayBuffer;
}

export interface QrDecodeResponse {
  id: number;
  text: string | null;
}
