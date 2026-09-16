import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { CSSProperties } from "react";
import { useUITheme } from "../../theme/ThemeProvider";
import { useResumePlaybackOnVisible } from "../../hooks/useResumePlaybackOnVisible";

interface StreamVideoProps {
  stream: MediaStream | null;
  muted?: boolean;
  objectFit?: "cover" | "contain";
  style?: CSSProperties;
}

// Phone encoders pad frames with green (zero YUV) rows; a slight overscan keeps that fringe outside the box.
const EDGE_OVERSCAN = 1.008;

export const StreamVideo = forwardRef<HTMLVideoElement, StreamVideoProps>(
  ({ stream, muted, objectFit = "cover", style }, forwardedRef) => {
    const { stage } = useUITheme();
    const videoRef = useRef<HTMLVideoElement>(null);
    useImperativeHandle(
      forwardedRef,
      () => videoRef.current as HTMLVideoElement,
    );
    useResumePlaybackOnVisible(videoRef);

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;
      if (!stream) {
        video.srcObject = null;
        return;
      }
      if (video.srcObject === stream) return;
      video.srcObject = stream;
      void video.play().catch(() => {});
    }, [stream]);

    return (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          background: stage.surface,
          ...style,
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          style={{
            width: "100%",
            height: "100%",
            objectFit,
            display: "block",
            transform: `scale(${EDGE_OVERSCAN})`,
          }}
        />
      </div>
    );
  },
);

StreamVideo.displayName = "StreamVideo";
