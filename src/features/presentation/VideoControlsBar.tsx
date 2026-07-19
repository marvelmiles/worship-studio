import { Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import type { VideoSettings } from "../../types";
import type { MediaPlayback } from "../../lib/presentChannel";
import { formatDuration } from "../../lib/media";
import { useUITheme } from "../../theme/ThemeProvider";
import { StageButton } from "../../components/ui/Button";

interface VideoControlsBarProps {
  playback: MediaPlayback;
  settings?: VideoSettings;
  time: number;
  duration: number;
  visible: boolean;
  onHoverChange: (hovering: boolean) => void;
  onTogglePlaying: () => void;
  onToggleMuted: () => void;
  onVolume: (volume: number) => void;
  onSeek: (time: number) => void;
  onRestart: () => void;
}

export function VideoControlsBar({
  playback,
  settings,
  time,
  duration,
  visible,
  onHoverChange,
  onTogglePlaying,
  onToggleMuted,
  onVolume,
  onSeek,
  onRestart,
}: VideoControlsBarProps) {
  const { colors, controls, fonts, stage } = useUITheme();
  const UI = fonts.ui;
  const start = settings?.trimStart ?? 0;
  const end = settings?.trimEnd ?? (duration || 0);
  const muted = playback.muted;
  const seekMax = Math.max(end, start + 0.1);
  const seekValue = Math.min(Math.max(time, start), end);
  const seekPct = ((seekValue - start) / (seekMax - start)) * 100;
  const volume = muted ? 0 : playback.volume;
  const sliderFill = (pct: number) =>
    `linear-gradient(90deg, ${colors.accent} 0%, ${colors.accentSoft} ${pct}%, ${controls.track} ${pct}%)`;

  return (
    <div
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      style={{
        position: "fixed",
        left: "50%",
        bottom: 86,
        transform: "translateX(-50%)",
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "min(680px, calc(100vw - 32px))",
        padding: "9px 12px",
        borderRadius: 14,
        background: stage.overlayStrong,
        backdropFilter: "blur(10px)",
        border: `1px solid ${stage.border}`,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transition: "opacity 0.3s ease",
      }}
    >
      <StageButton
        icon={playback.playing ? Pause : Play}
        title={playback.playing ? "Pause video (Space)" : "Play video (Space)"}
        onClick={onTogglePlaying}
      />
      <StageButton icon={RotateCcw} title="Restart from trim start" onClick={onRestart} />
      <span
        style={{
          fontFamily: UI,
          fontSize: 12,
          color: stage.text,
          fontVariantNumeric: "tabular-nums",
          minWidth: 38,
          textAlign: "right",
        }}
      >
        {formatDuration(time)}
      </span>
      <input
        type="range"
        className="ws-slider"
        min={start}
        max={seekMax}
        step={0.1}
        value={seekValue}
        onChange={(e) => onSeek(Number(e.target.value))}
        style={{ flex: 1, background: sliderFill(seekPct) }}
      />
      <span
        style={{
          fontFamily: UI,
          fontSize: 12,
          color: "rgba(255,255,255,0.6)",
          fontVariantNumeric: "tabular-nums",
          minWidth: 38,
        }}
      >
        {formatDuration(end)}
      </span>
      <StageButton
        icon={muted ? VolumeX : Volume2}
        title={muted ? "Unmute (M)" : "Mute (M)"}
        active={muted}
        onClick={onToggleMuted}
      />
      <input
        type="range"
        className="ws-slider"
        min={0}
        max={100}
        value={volume}
        onChange={(e) => onVolume(Number(e.target.value))}
        style={{ width: 84, background: sliderFill(volume) }}
      />
    </div>
  );
}
