import { useEffect, useRef, useState } from "react";
import { useUITheme } from "../../theme/ThemeProvider";
import { scanFrame } from "./lib/qr";

/**
 * Opens the front-or-back camera and watches for a QR code, calling `onResult`
 * with its text once. Used on both sides of the handshake: the laptop scans
 * the phone's reply, the phone scans the laptop's invite.
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
  const workCanvas = useRef<HTMLCanvasElement>(document.createElement("canvas"));
  const doneRef = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    doneRef.current = false;

    const tick = () => {
      if (doneRef.current) return;
      const video = videoRef.current;
      if (video && video.readyState >= 2) {
        const text = scanFrame(video, workCanvas.current);
        if (text) {
          doneRef.current = true;
          onResult(text);
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: facing }, audio: false })
      .then((s) => {
        stream = s;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = s;
        void video.play();
        setReady(true);
        raf = requestAnimationFrame(tick);
      })
      .catch(() => onError?.("Couldn't open the camera. Check camera permission and try again."));

    return () => {
      doneRef.current = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [facing, onResult, onError]);

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
          inset: "18%",
          border: `2px solid ${ready ? colors.accentSoft : "rgba(255,255,255,0.5)"}`,
          borderRadius: 12,
          boxShadow: "0 0 0 100vmax rgba(0,0,0,0.35)",
        }}
      />
    </div>
  );
}
