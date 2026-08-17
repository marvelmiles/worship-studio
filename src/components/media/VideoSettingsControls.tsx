import { TimerReset } from "lucide-react";
import type { VideoSettings } from "../../types";
import { useUITheme } from "../../theme/ThemeProvider";
import { formatDuration } from "../../lib/media";
import { Button } from "../ui/Button";
import {
  Field,
  Range,
  SectionTitle,
  Select,
  TextInput,
  Toggle,
} from "../ui/Field";
import { AdjustmentControls } from "./AdjustmentControls";

const FIT_OPTIONS = [
  { value: "contain", label: "Contain (fit, letterboxed)" },
  { value: "cover", label: "Cover (fill, may crop)" },
  { value: "fill", label: "Fill (stretch)" },
];

const RATE_OPTIONS = ["0.5", "0.75", "1", "1.25", "1.5", "2"].map((value) => ({
  value,
  label: `${value}×`,
}));

interface VideoSettingsControlsProps {
  settings: VideoSettings;
  onChange: (changes: Partial<VideoSettings>) => void;
  /** Length of the clip, shown so the trim points read against something. */
  duration?: number;
  /** Where the preview is parked, for the "Playhead" capture buttons. */
  playheadTime: () => number;
  /** Stacks the paired controls, for a narrow sidebar. */
  narrow?: boolean;
}

/**
 * Every setting a clip carries: where playback starts and stops, how it sounds
 * and moves, and how it is graded. Shared by the video editor page and any
 * other surface that tunes a library clip.
 */
export function VideoSettingsControls({
  settings,
  onChange,
  duration,
  playheadTime,
  narrow,
}: VideoSettingsControlsProps) {
  const { colors, fonts } = useUITheme();
  const columns = narrow ? "1fr" : "repeat(auto-fit,minmax(200px,1fr))";

  return (
    <>
      <SectionTitle>Trim</SectionTitle>
      <p
        style={{
          fontFamily: fonts.ui,
          fontSize: 12.5,
          color: colors.sub,
          margin: "0 0 12px",
          lineHeight: 1.5,
        }}
      >
        Playback runs from the trim start to the trim end
        {duration ? ` (video is ${formatDuration(duration)})` : ""}. Scrub the
        preview, then capture the playhead.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: columns, gap: 12 }}>
        <Field label={`Start: ${formatDuration(settings.trimStart)}`}>
          <div className="ws-row">
            <TextInput
              type="number"
              min={0}
              step={0.1}
              value={String(settings.trimStart)}
              onChange={(event) =>
                onChange({
                  trimStart: Math.max(0, Number(event.target.value) || 0),
                })
              }
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onChange({ trimStart: playheadTime() })}
            >
              <TimerReset size={13} />
              Playhead
            </Button>
          </div>
        </Field>
        <Field
          label={`End: ${settings.trimEnd === null ? "full length" : formatDuration(settings.trimEnd)}`}
        >
          <div className="ws-row">
            <TextInput
              type="number"
              min={0}
              step={0.1}
              value={settings.trimEnd === null ? "" : String(settings.trimEnd)}
              placeholder="Full length"
              onChange={(event) =>
                onChange({
                  trimEnd:
                    event.target.value === ""
                      ? null
                      : Math.max(0, Number(event.target.value) || 0),
                })
              }
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onChange({ trimEnd: playheadTime() })}
            >
              <TimerReset size={13} />
              Playhead
            </Button>
          </div>
        </Field>
      </div>

      <SectionTitle>Playback</SectionTitle>
      <div
        style={{ display: "grid", gridTemplateColumns: columns, gap: "0 16px" }}
      >
        <Field label={`Volume (${settings.volume}%)`}>
          <Range
            value={settings.volume}
            min={0}
            max={100}
            suffix="%"
            onChange={(event) =>
              onChange({ volume: Number(event.target.value) })
            }
          />
        </Field>
        <Field label="Speed">
          <Select
            value={String(settings.playbackRate)}
            options={RATE_OPTIONS}
            onChange={(event) =>
              onChange({ playbackRate: Number(event.target.value) })
            }
          />
        </Field>
        <Field label="Screen fit">
          <Select
            value={settings.fit}
            options={FIT_OPTIONS}
            onChange={(event) =>
              onChange({ fit: event.target.value as VideoSettings["fit"] })
            }
          />
        </Field>
      </div>
      <div
        style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 4 }}
      >
        <div style={{ flex: 1, minWidth: 180 }}>
          <Toggle
            label="Muted"
            checked={settings.muted}
            onChange={(muted) => onChange({ muted })}
          />
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <Toggle
            label="Loop"
            checked={settings.loop}
            onChange={(loop) => onChange({ loop })}
          />
        </div>
      </div>

      <SectionTitle>Adjustments</SectionTitle>
      <AdjustmentControls value={settings} onChange={onChange} />
    </>
  );
}
