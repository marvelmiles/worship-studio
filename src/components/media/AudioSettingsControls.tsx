import type { ReactNode } from "react";
import { Crosshair } from "lucide-react";
import type { AudioSettings } from "../../types";
import {
  formatDuration,
  needsHoursField,
  timecodeShape,
  validateTrimEnd,
  validateTrimStart,
} from "../../lib/media";
import { Field, Range, SectionTitle } from "../ui/Field";
import { IconButton } from "../ui/Button";
import { TimecodeInput } from "../ui/TimecodeInput";
import { InfoTip } from "../ui/InfoTip";

interface AudioSettingsControlsProps {
  settings: AudioSettings;
  onChange: (changes: Partial<AudioSettings>) => void;
  duration?: number;
  playhead: number;
  onIssueChange?: (field: string, message: string | null) => void;
}

export const AudioSettingsControls = ({
  settings,
  onChange,
  duration,
  playhead,
  onIssueChange,
}: AudioSettingsControlsProps) => {
  const withHours = needsHoursField(duration);
  const shape = timecodeShape(withHours);
  const bounds = { duration, withHours };
  const roundedPlayhead = Math.round(playhead);

  const trimField = (
    label: string,
    input: ReactNode,
    onUsePlayhead: () => void,
  ) => (
    <Field label={label}>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 0 }}>{input}</div>
        <IconButton
          icon={Crosshair}
          title="Set to the playhead"
          filled
          onClick={onUsePlayhead}
        />
      </div>
    </Field>
  );

  return (
    <>
      <SectionTitle
        info={
          <InfoTip title="Trim">
            Playback runs from the trim start to the trim end
            {duration ? ` (sound is ${formatDuration(duration)})` : ""}, and
            loops back to the start while slides are shown.
          </InfoTip>
        }
      >
        Trim
      </SectionTitle>
      {trimField(
        `Start (${shape})`,
        <TimecodeInput
          aria-label="Trim start"
          seconds={settings.trimStart}
          withHours={withHours}
          validate={(value) =>
            validateTrimStart(value, settings.trimEnd, bounds)
          }
          onErrorChange={(message) => onIssueChange?.("trimStart", message)}
          onChange={(trimStart) => onChange({ trimStart: trimStart ?? 0 })}
        />,
        () => {
          if (!validateTrimStart(roundedPlayhead, settings.trimEnd, bounds))
            onChange({ trimStart: roundedPlayhead });
        },
      )}
      {trimField(
        `End (${shape})`,
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
        />,
        () => {
          if (!validateTrimEnd(roundedPlayhead, settings.trimStart, bounds))
            onChange({ trimEnd: roundedPlayhead });
        },
      )}

      <SectionTitle>Level</SectionTitle>
      <Field label={`Volume (${settings.volume}%)`}>
        <Range
          value={settings.volume}
          min={0}
          max={100}
          suffix="%"
          onChange={(event) => onChange({ volume: Number(event.target.value) })}
        />
      </Field>
    </>
  );
};
