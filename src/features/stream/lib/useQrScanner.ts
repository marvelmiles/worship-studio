import { useEffect, useRef, useState } from "react";
import { createQrFrameDecoder } from "./qrFrameDecoder";

export type ScanFacing = "environment" | "user";

type AdvancedCameraConstraints = MediaTrackConstraintSet & {
  focusMode?: string;
};

const scanCameraConstraints = (facing: ScanFacing): MediaStreamConstraints => ({
  video: {
    facingMode: facing,
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    advanced: [{ focusMode: "continuous" } as AdvancedCameraConstraints],
  },
  audio: false,
});

const nextAnimationFrame = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => resolve()));

interface UseQrScannerOptions {
  facing: ScanFacing;
  onResult: (text: string) => void;
  onError?: (message: string) => void;
}

// The camera is released before onResult runs: most phones hold one camera at a time and open the broadcast camera next.
export const useQrScanner = ({
  facing,
  onResult,
  onError,
}: UseQrScannerOptions) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onResultRef.current = onResult;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    let isStopped = false;
    let stream: MediaStream | null = null;
    const decoder = createQrFrameDecoder();

    const releaseCamera = () => {
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };

    const scanUntilFound = async (video: HTMLVideoElement) => {
      while (!isStopped) {
        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          for (const text of await decoder.decode(video)) {
            if (isStopped) return;
            isStopped = true;
            releaseCamera();
            onResultRef.current(text);
            return;
          }
        }
        await nextAnimationFrame();
      }
    };

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia(
          scanCameraConstraints(facing),
        );
      } catch {
        if (!isStopped) {
          onErrorRef.current?.(
            "Couldn't open the camera. Check camera permission and try again.",
          );
        }
        return;
      }
      const video = videoRef.current;
      if (isStopped || !video) {
        releaseCamera();
        return;
      }
      video.srcObject = stream;
      void video.play().catch(() => {});
      setIsCameraReady(true);
      await scanUntilFound(video);
    };

    void start();

    return () => {
      isStopped = true;
      releaseCamera();
      decoder.dispose();
    };
  }, [facing]);

  return { videoRef, isCameraReady };
};
