import type { AudioSettings } from "../../types";
import { formatDuration } from "../../lib/media";
import { Field, Range, SectionTitle } from "../ui/Field";
import { InfoTip } from "../ui/InfoTip";
import { TrimFields } from "./TrimFields";

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
      <TrimFields
        trim={settings}
        onChange={onChange}
        duration={duration}
        playhead={playhead}
        onIssueChange={onIssueChange}
      />

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
