import type { CSSProperties } from "react";
import {
  formatDuration,
  videoPosition,
  type VideoProgress,
} from "../../lib/media";

interface VideoTimecodeProps {
  progress: VideoProgress;
  style?: CSSProperties;
}

export const VideoTimecode = ({ progress, style }: VideoTimecodeProps) => {
  return (
    <span
      style={{
        fontVariantNumeric: "tabular-nums",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {formatDuration(videoPosition(progress))} / {formatDuration(progress.end)}
    </span>
  );
};
