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

/**
 * Where a clip is against where it ends, written the way every player writes
 * it. Shown wherever a presentation is being watched rather than driven: the
 * presenter bar and the floating presenter both carry one.
 */
export function VideoTimecode({ progress, style }: VideoTimecodeProps) {
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
}
