import { useEffect, useRef, useState } from "react";
import { useUITheme } from "../../theme/ThemeProvider";
import { scanFrame } from "./lib/qr";

/**
 * The decode resolutions each frame is tried at, in turn. A dense handshake code
 * needs pixels per module, and a blurred one reads better slightly downscaled,
 * so alternating covers both rather than betting the whole scan on one of them.
 */
const SCAN_SIDES = [1280, 720];

/** Constraints browsers only expose through `advanced`, and only some of them. */
type AdvancedCameraConstraints = MediaTrackConstraintSet & {
  focusMode?: string;
};

/**
 * Opens the front-or-back camera and watches for a QR code, calling `onResult`
 * with its text once. Used on both sides of the handshake: the laptop scans
 * the phone's reply, the phone scans the laptop's invite.
 *
 * The camera is released before `onResult` runs, not when this unmounts. The
 * phone's next move after reading the invite is to open its camera for the
 * broadcast, and a device that only grants one camera at a time (which is most
 * phones) refuses that second request while the scanner still holds the first:
 * the scan would succeed and the connection would then fail to start.
 */
export function QrScanner({
  facing = "environment",
  onResult,
  onError,
}: {
  facing?: "environment" | "user";
  onResult: (text: string) => void;
  onError?: (message: string) => void;
}) {
  const { colors } = useUITheme();
  const videoRef = useRef<HTMLVideoElement>(null);
  const workCanvas = useRef<HTMLCanvasElement>(
    document.createElement("canvas"),
  );
  const streamRef = useRef<MediaStream | null>(null);
  const doneRef = useRef(false);
  const [ready, setReady] = useState(false);

  // Keep the latest callbacks in refs so the scanning effect depends only on
  // `facing`. Otherwise a fresh `onResult`/`onError` on every parent re-render
  // would tear down and reopen the camera each time, and the video would never
  // hold still long enough to capture a decodable frame.
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  onResultRef.current = onResult;
  onErrorRef.current = onError;

  useEffect(() => {
    let raf = 0;
    let attempt = 0;
    doneRef.current = false;

    const releaseCamera = () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      const video = videoRef.current;
      if (video) video.srcObject = null;
    };

    const tick = () => {
      if (doneRef.current) return;
      const video = videoRef.current;
      if (video && video.readyState >= 2) {
        const side = SCAN_SIDES[attempt % SCAN_SIDES.length];
        attempt += 1;
        const text = scanFrame(video, workCanvas.current, side);
        if (text) {
          doneRef.current = true;
          cancelAnimationFrame(raf);
          releaseCamera();
          onResultRef.current(text);
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };

    navigator.mediaDevices
      // A handshake QR is dense (it carries a whole deflated SDP), so the
      // capture needs to be high-resolution or jsQR can't resolve the modules,
      // and it needs to stay focused on a screen held close. facingMode and the
      // focus hint both stay advisory (no `exact`) so a laptop with one webcam,
      // or a camera with no focus control, still opens instead of rejecting.
      .getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          advanced: [{ focusMode: "continuous" } as AdvancedCameraConstraints],
        },
        audio: false,
      })
      .then((stream) => {
        if (doneRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        void video.play();
        setReady(true);
        raf = requestAnimationFrame(tick);
      })
      .catch(() =>
        onErrorRef.current?.(
          "Couldn't open the camera. Check camera permission and try again.",
        ),
      );

    return () => {
      doneRef.current = true;
      cancelAnimationFrame(raf);
      releaseCamera();
    };
  }, [facing]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 360,
        aspectRatio: "1 / 1",
        borderRadius: 16,
        overflow: "hidden",
        background: "#000",
        border: `1px solid ${colors.border}`,
      }}
    >
      <video
        ref={videoRef}
        playsInline
        muted
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
      {/* Aiming frame so the user knows where to hold the code. */}
      <div
        style={{
          position: "absolute",
          inset: "8%",
          border: `2px solid ${ready ? colors.accentSoft : "rgba(255,255,255,0.5)"}`,
          borderRadius: 12,
          boxShadow: "0 0 0 100vmax rgba(0,0,0,0.35)",
        }}
      />
    </div>
  );
}
