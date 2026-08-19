import type { CSSProperties } from "react";
import { Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import { formatTimecode, needsHoursField } from "../../lib/media";
import { StageButton } from "../ui/Button";

interface VideoTransportBarProps {
  playing: boolean;
  muted: boolean;
  /** Output level, 0 to 100. */
  volume: number;
  /** Where the clip is, and the trim window it is being played inside. */
  time: number;
  start: number;
  end: number;
  onTogglePlaying: () => void;
  onRestart: () => void;
  onToggleMuted: () => void;
  onVolume: (volume: number) => void;
  onSeek: (time: number) => void;
  /** False fades the bar out without unmounting it, so the clip keeps running. */
  visible?: boolean;
  /** Pins the bar open while the pointer rests on it. */
  onHoverChange?: (hovering: boolean) => void;
  /**
   * Drops the level slider and the run time, leaving the transport and the mute
   * control, so the bar still fits across a phone.
   */
  compact?: boolean;
  /** Where the bar sits over the surface it belongs to. */
  style?: CSSProperties;
}

/**
 * The transport a clip is driven by, wherever it is being watched: play, rewind
 * to the trim start, scrub inside the trimmed window, mute and set the level.
 *
 * One bar serves the projected stage and the media editor's preview, so an
 * operator who learns the controls on a Sunday finds the same ones when they
 * open the clip to trim it on the Monday.
 */
export function VideoTransportBar({
  playing,
  muted,
  volume,
  time,
  start,
  end,
  onTogglePlaying,
  onRestart,
  onToggleMuted,
  onVolume,
  onSeek,
  visible = true,
  onHoverChange,
  compact,
  style,
}: VideoTransportBarProps) {
  const { colors, controls, fonts, stage } = useUITheme();
  const seekMax = Math.max(end, start + 0.1);
  const position = Math.min(Math.max(time, start), seekMax);
  const seekPercent = ((position - start) / (seekMax - start)) * 100;
  const level = muted ? 0 : volume;
  const withHours = needsHoursField(seekMax);
  const fill = (percent: number) =>
    `linear-gradient(90deg, ${colors.accent} 0%, ${colors.accentSoft} ${percent}%, ${controls.track} ${percent}%)`;

  const readout: CSSProperties = {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: stage.text,
    fontVariantNumeric: "tabular-nums",
    minWidth: withHours ? 56 : 40,
  };

  return (
    <div
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: compact ? 6 : 10,
        padding: compact ? "8px 9px" : "9px 12px",
        borderRadius: 14,
        background: stage.overlayStrong,
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: `1px solid ${stage.border}`,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transition: "opacity 0.3s ease",
        ...style,
      }}
    >
      <StageButton
        icon={playing ? Pause : Play}
        title={playing ? "Pause video (Space)" : "Play video (Space)"}
        onClick={onTogglePlaying}
      />
      <StageButton
        icon={RotateCcw}
        title="Replay from the trim start"
        onClick={onRestart}
      />
      <span style={{ ...readout, textAlign: "right" }}>
        {formatTimecode(position, withHours)}
      </span>
      <input
        type="range"
        className="ws-slider"
        aria-label="Playhead"
        min={start}
        max={seekMax}
        step={0.1}
        value={position}
        onChange={(event) => onSeek(Number(event.target.value))}
        style={{ flex: 1, minWidth: 0, background: fill(seekPercent) }}
      />
      {!compact && (
        <span style={{ ...readout, color: colors.sub }}>
          {formatTimecode(seekMax, withHours)}
        </span>
      )}
      <StageButton
        icon={muted ? VolumeX : Volume2}
        title={muted ? "Unmute (M)" : "Mute (M)"}
        active={muted}
        onClick={onToggleMuted}
      />
      {!compact && (
        <input
          type="range"
          className="ws-slider"
          aria-label="Volume"
          min={0}
          max={100}
          value={level}
          onChange={(event) => onVolume(Number(event.target.value))}
          style={{ width: 84, flexShrink: 0, background: fill(level) }}
        />
      )}
    </div>
  );
}
