import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { CSSProperties } from "react";

interface StreamVideoProps {
  stream: MediaStream | null;
  /**
   * Silences this copy. Several surfaces point at the very same stream at once
   * (the stage, the floating window, the projector), so only the one the room
   * is listening to is left unmuted.
   */
  muted?: boolean;
  /** "cover" never distorts; it only trims the overflow when shapes differ. */
  objectFit?: "cover" | "contain";
  style?: CSSProperties;
}

/**
 * A live MediaStream in a `<video>`.
 *
 * A stream is attached through `srcObject` rather than a `src`, and re-assigning
 * one the element is already playing restarts the picture, so the write is
 * guarded. Every surface that shows a camera goes through this, which is what
 * keeps that guard in one place rather than in four.
 */
export const StreamVideo = forwardRef<HTMLVideoElement, StreamVideoProps>(
  function StreamVideo(
    { stream, muted, objectFit = "cover", style },
    forwardedRef,
  ) {
    const videoRef = useRef<HTMLVideoElement>(null);
    useImperativeHandle(
      forwardedRef,
      () => videoRef.current as HTMLVideoElement,
    );

    useEffect(() => {
      const el = videoRef.current;
      if (!el) return;
      if (!stream) {
        el.srcObject = null;
        return;
      }
      if (el.srcObject === stream) return;
      el.srcObject = stream;
      void el.play().catch(() => {});
    }, [stream]);

    return (
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
          background: "#000",
          ...style,
        }}
      />
    );
  },
);
