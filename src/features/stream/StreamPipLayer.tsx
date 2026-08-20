import type { CSSProperties } from "react";
import type { PipCorner, PipPlacement } from "../../types";
import { pipFrameStyle } from "../../lib/pipPlacement";
import { StreamVideo } from "./StreamVideo";

export interface StreamPipWindow {
  id: string;
  label: string;
  stream: MediaStream | null;
  placement: PipPlacement;
  muted: boolean;
}

/** A joined camera as a corner window, named by the device it comes from. */
export const cameraPipWindow = (camera: {
  deviceId: string;
  deviceName: string;
  stream: MediaStream | null;
  placement: PipPlacement;
  muted: boolean;
}): StreamPipWindow => ({
  id: camera.deviceId,
  label: camera.deviceName,
  stream: camera.stream,
  placement: camera.placement,
  muted: camera.muted,
});

interface StreamPipLayerProps {
  windows: StreamPipWindow[];
  /**
   * Names each window on the operator's own surfaces. The projector shows the
   * picture and nothing else, so it leaves this off.
   */
  showLabels?: boolean;
  /** Silences every window regardless of its own setting. */
  forceMuted?: boolean;
}

const FRAME_STYLE: CSSProperties = {
  overflow: "hidden",
  borderRadius: "2.5%",
  background: "#000",
  boxShadow: "0 8px 28px rgba(0,0,0,0.55)",
  outline: "1px solid rgba(255,255,255,0.22)",
  outlineOffset: -1,
};

const LABEL_STYLE: CSSProperties = {
  position: "absolute",
  left: "4%",
  bottom: "6%",
  maxWidth: "84%",
  padding: "1.5% 4%",
  borderRadius: 999,
  background: "rgba(0,0,0,0.6)",
  color: "#fff",
  fontFamily: "system-ui, sans-serif",
  fontSize: "clamp(8px, 7cqw, 13px)",
  fontWeight: 700,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  pointerEvents: "none",
};

/**
 * The extra cameras, drawn in the corners of whichever picture is underneath.
 *
 * Placement is in percentages of that picture (see lib/pipPlacement.ts), so one
 * arrangement is right on the operator's stage, in the floating window and on
 * the projector at once without any of them measuring anything. Windows sharing
 * a corner stack sideways rather than covering each other.
 */
export function StreamPipLayer({
  windows,
  showLabels,
  forceMuted,
}: StreamPipLayerProps) {
  if (windows.length === 0) return null;

  const stacked = new Map<PipCorner, number>();

  return (
    <>
      {windows.map((window) => {
        const index = stacked.get(window.placement.corner) ?? 0;
        stacked.set(window.placement.corner, index + 1);
        return (
          <div
            key={window.id}
            style={{
              ...pipFrameStyle(window.placement, index),
              ...FRAME_STYLE,
              containerType: "inline-size",
            }}
          >
            <StreamVideo
              stream={window.stream}
              muted={forceMuted || window.muted}
            />
            {showLabels && <span style={LABEL_STYLE}>{window.label}</span>}
          </div>
        );
      })}
    </>
  );
}
