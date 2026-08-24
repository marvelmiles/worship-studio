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
 * How much of the picture's edge is cropped away.
 *
 * Phone encoders pad a frame out to the macroblock size their hardware works
 * in, and that padding is left as zeroes. Zero in YUV is not black, it is
 * green, and once the frame is scaled to a surface the sampler blends those
 * padded rows into the visible edge: the green fringe that shows up down the
 * side of some phones' feeds on every surface at once.
 *
 * Nothing in the video API exposes where the real picture stops, so the fix is
 * to overscan slightly and let the frame's outermost fraction fall outside the
 * box. 0.4% of an edge is a few pixels of a 1080p frame and invisible on a
 * camera feed, while being more than the padding is ever wide.
 */
const EDGE_OVERSCAN = 1.008;

/**
 * A live MediaStream in a `<video>`.
 *
 * A stream is attached through `srcObject` rather than a `src`, and re-assigning
 * one the element is already playing restarts the picture, so the write is
 * guarded. Every surface that shows a camera goes through this, which is what
 * keeps that guard, and the edge crop above, in one place rather than in four.
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
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          background: "#000",
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
