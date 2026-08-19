import { useState } from "react";
import { formatTimecode, parseTimecode } from "../../lib/media";
import { TextInput } from "./Field";

interface TimecodeInputProps {
  /** Position in seconds, or null for a field that is allowed to be empty. */
  seconds: number | null;
  onChange: (seconds: number | null) => void;
  /** Writes the field as hh:mm:ss instead of mm:ss. */
  withHours: boolean;
  /** Longest position the field will accept, so a trim cannot run past the clip. */
  max?: number;
  placeholder?: string;
  /** Lets the field be cleared, which reports null rather than zero. */
  clearable?: boolean;
  "aria-label"?: string;
}

/** What is being typed, and the value that was in force while it was typed. */
interface TypingState {
  text: string;
  seconds: number | null;
}

/**
 * A clip position typed as a timecode rather than a raw number of seconds.
 *
 * What is typed stays as typed while the field is being written into, so `1:3`
 * can be finished into `1:30` and the field can be emptied and started again
 * without rewriting itself under the cursor. A value arriving from anywhere
 * else, an undo or the playhead button, takes the field back: the typed text is
 * only kept while the value it produced is still the one in force.
 */
export function TimecodeInput({
  seconds,
  onChange,
  withHours,
  max,
  placeholder,
  clearable,
  "aria-label": ariaLabel,
}: TimecodeInputProps) {
  const [typing, setTyping] = useState<TypingState | null>(null);
  const settled = seconds === null ? "" : formatTimecode(seconds, withHours);
  const value = typing?.seconds === seconds ? typing.text : settled;

  const handleChange = (text: string) => {
    if (!text.trim()) {
      setTyping({ text, seconds: clearable ? null : seconds });
      if (clearable) onChange(null);
      return;
    }
    const parsed = parseTimecode(text);
    if (parsed === null) {
      setTyping({ text, seconds });
      return;
    }
    const next = max === undefined ? parsed : Math.min(parsed, max);
    setTyping({ text, seconds: next });
    onChange(next);
  };

  return (
    <TextInput
      type="text"
      inputMode="numeric"
      aria-label={ariaLabel}
      placeholder={placeholder ?? (withHours ? "hh:mm:ss" : "mm:ss")}
      value={value}
      onChange={(event) => handleChange(event.target.value)}
      onBlur={() => setTyping(null)}
      style={{ fontVariantNumeric: "tabular-nums" }}
    />
  );
}
