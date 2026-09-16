import type { VideoSettings } from "../../types";
import {
  formatDuration,
  needsHoursField,
  timecodeShape,
  validateTrimEnd,
  validateTrimStart,
} from "../../lib/media";
import { Field, Range, SectionTitle, Select, Toggle } from "../ui/Field";
import { TimecodeInput } from "../ui/TimecodeInput";
import { InfoTip } from "../ui/InfoTip";
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
  duration?: number;
  onIssueChange?: (field: string, message: string | null) => void;
  narrow?: boolean;
}

export const VideoSettingsControls = ({
  settings,
  onChange,
  duration,
  onIssueChange,
  narrow,
}: VideoSettingsControlsProps) => {
  const columns = narrow ? "1fr" : "repeat(auto-fit,minmax(200px,1fr))";
  const withHours = needsHoursField(duration);
  const shape = timecodeShape(withHours);
  const bounds = { duration, withHours };

  return (
    <>
      <SectionTitle
        info={
          <InfoTip title="Trim">
            Playback runs from the trim start to the trim end
            {duration ? ` (video is ${formatDuration(duration)})` : ""}. Write
            both as {shape}, two digits per field. Clearing the end takes it
            back to the last frame.
          </InfoTip>
        }
      >
        Trim
      </SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: columns, gap: 12 }}>
        <Field label={`Start (${shape})`}>
          <TimecodeInput
            aria-label="Trim start"
            seconds={settings.trimStart}
            withHours={withHours}
            validate={(value) =>
              validateTrimStart(value, settings.trimEnd, bounds)
            }
            onErrorChange={(message) => onIssueChange?.("trimStart", message)}
            onChange={(trimStart) => onChange({ trimStart: trimStart ?? 0 })}
          />
        </Field>
        <Field label={`End (${shape})`}>
          <TimecodeInput
            aria-label="Trim end"
            seconds={settings.trimEnd ?? (duration || null)}
            withHours={withHours}
            placeholder={shape}
            clearable
            validate={(value) =>
              validateTrimEnd(value, settings.trimStart, bounds)
            }
            onErrorChange={(message) => onIssueChange?.("trimEnd", message)}
            onChange={(trimEnd) => onChange({ trimEnd })}
          />
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
};
