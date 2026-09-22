import type { ReactNode } from "react";
import { Crosshair } from "lucide-react";
import {
  needsHoursField,
  timecodeShape,
  validateTrimEnd,
  validateTrimStart,
  type TrimRange,
} from "../../lib/media";
import { IconButton } from "../ui/Button";
import { Field } from "../ui/Field";
import { TimecodeInput } from "../ui/TimecodeInput";

interface TrimFieldsProps {
  trim: TrimRange;
  onChange: (changes: Partial<TrimRange>) => void;
  duration?: number;
  playhead?: number;
  columns?: string;
  onIssueChange?: (field: string, message: string | null) => void;
}

export const TrimFields = ({
  trim,
  onChange,
  duration,
  playhead,
  columns = "1fr",
  onIssueChange,
}: TrimFieldsProps) => {
  const withHours = needsHoursField(duration);
  const shape = timecodeShape(withHours);
  const bounds = { duration, withHours };
  const roundedPlayhead =
    playhead === undefined ? null : Math.round(Math.max(0, playhead));

  const trimField = (
    label: string,
    input: ReactNode,
    applyPlayhead: (seconds: number) => void,
  ) => (
    <Field label={label}>
      {roundedPlayhead === null ? (
        input
      ) : (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 0 }}>{input}</div>
          <IconButton
            icon={Crosshair}
            title="Set to the playhead"
            filled
            onClick={() => applyPlayhead(roundedPlayhead)}
          />
        </div>
      )}
    </Field>
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: columns, gap: 12 }}>
      {trimField(
        `Start (${shape})`,
        <TimecodeInput
          aria-label="Trim start"
          seconds={trim.trimStart}
          withHours={withHours}
          validate={(value) => validateTrimStart(value, trim.trimEnd, bounds)}
          onErrorChange={(message) => onIssueChange?.("trimStart", message)}
          onChange={(trimStart) => onChange({ trimStart: trimStart ?? 0 })}
        />,
        (seconds) => {
          if (!validateTrimStart(seconds, trim.trimEnd, bounds))
            onChange({ trimStart: seconds });
        },
      )}
      {trimField(
        `End (${shape})`,
        <TimecodeInput
          aria-label="Trim end"
          seconds={trim.trimEnd ?? (duration || null)}
          withHours={withHours}
          placeholder={shape}
          clearable
          validate={(value) => validateTrimEnd(value, trim.trimStart, bounds)}
          onErrorChange={(message) => onIssueChange?.("trimEnd", message)}
          onChange={(trimEnd) => onChange({ trimEnd })}
        />,
        (seconds) => {
          if (!validateTrimEnd(seconds, trim.trimStart, bounds))
            onChange({ trimEnd: seconds });
        },
      )}
    </div>
  );
};
