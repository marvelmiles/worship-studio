import type { VideoSettings } from "../../types";
import {
  formatDuration,
  needsHoursField,
  timecodeShape,
} from "../../lib/media";
import { Field, Range, SectionTitle, Select, Toggle } from "../ui/Field";
import { InfoTip } from "../ui/InfoTip";
import { AdjustmentControls } from "./AdjustmentControls";
import { TrimFields } from "./TrimFields";

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
  playhead?: number;
  onIssueChange?: (field: string, message: string | null) => void;
  narrow?: boolean;
}

export const VideoSettingsControls = ({
  settings,
  onChange,
  duration,
  playhead,
  onIssueChange,
  narrow,
}: VideoSettingsControlsProps) => {
  const columns = narrow ? "1fr" : "repeat(auto-fit,minmax(200px,1fr))";
  const shape = timecodeShape(needsHoursField(duration));

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
      <TrimFields
        trim={settings}
        onChange={onChange}
        duration={duration}
        playhead={playhead}
        columns={columns}
        onIssueChange={onIssueChange}
      />

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
