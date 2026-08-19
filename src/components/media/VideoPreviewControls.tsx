import { Pause, Play, RotateCcw } from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import { formatDuration } from "../../lib/media";
import { IconButton } from "../ui/Button";

interface VideoPreviewControlsProps {
  playing: boolean;
  /** Where the clip is now, and the trim window it is being played inside. */
  time: number;
  trimStart: number;
  trimEnd: number;
  onTogglePlaying: () => void;
  onRestart: () => void;
  onSeek: (time: number) => void;
}

/**
 * The transport under the media editor's preview: play, rewind to the trim
 * start, and scrub inside the trimmed window so the clip can be parked exactly
 * where a trim point should be captured.
 */
export function VideoPreviewControls({
  playing,
  time,
  trimStart,
  trimEnd,
  onTogglePlaying,
  onRestart,
  onSeek,
}: VideoPreviewControlsProps) {
  const { colors, controls, fonts } = useUITheme();
  const end = Math.max(trimEnd, trimStart + 0.1);
  const position = Math.min(Math.max(time, trimStart), end);
  const filled = ((position - trimStart) / (end - trimStart)) * 100;

  const readout = {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: colors.sub,
    fontVariantNumeric: "tabular-nums" as const,
    minWidth: 44,
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 10px",
        borderRadius: 12,
        border: `1px solid ${colors.border}`,
        background: colors.raise,
      }}
    >
      <IconButton
        icon={playing ? Pause : Play}
        title={playing ? "Pause" : "Play"}
        size="sm"
        onClick={onTogglePlaying}
      />
      <IconButton
        icon={RotateCcw}
        title="Rewind to trim start"
        size="sm"
        onClick={onRestart}
      />
      <span style={{ ...readout, textAlign: "right" }}>
        {formatDuration(position)}
      </span>
      <input
        type="range"
        className="ws-slider"
        aria-label="Playhead"
        min={trimStart}
        max={end}
        step={0.1}
        value={position}
        onChange={(event) => onSeek(Number(event.target.value))}
        style={{
          flex: 1,
          minWidth: 0,
          background: `linear-gradient(90deg, ${colors.accent} 0%, ${colors.accentSoft} ${filled}%, ${controls.track} ${filled}%)`,
        }}
      />
      <span style={readout}>{formatDuration(end)}</span>
    </div>
  );
}
