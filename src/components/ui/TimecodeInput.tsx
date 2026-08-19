import { useEffect, useRef, useState } from "react";
import { useUITheme } from "../../theme/ThemeProvider";
import {
  formatTimecode,
  isPartialTimecode,
  parseTimecode,
  timecodeShape,
} from "../../lib/media";
import { TextInput } from "./Field";

interface TimecodeInputProps {
  /** Position in seconds, or null for a field that is allowed to be empty. */
  seconds: number | null;
  onChange: (seconds: number | null) => void;
  /** Writes the field as hh:mm:ss instead of mm:ss. */
  withHours: boolean;
  placeholder?: string;
  /** Lets the field be cleared, which reports null rather than zero. */
  clearable?: boolean;
  /** Returns why this position can't be used here, or null when it can. */
  validate?: (seconds: number | null) => string | null;
  /**
   * Reports what the field is refusing, so the editor around it can hold its
   * save back rather than writing the last usable value behind the operator's
   * back. Called with null the moment the field is usable again.
   */
  onErrorChange?: (message: string | null) => void;
  "aria-label"?: string;
}

/** What is being typed, the value in force while it was typed, and its fault. */
interface TypingState {
  text: string;
  seconds: number | null;
  error: string | null;
}

/**
 * A clip position typed as a timecode rather than a raw number of seconds.
 *
 * What is typed stays as typed while the field is being written into, so `01:3`
 * can be finished into `01:30` and the field can be emptied and started again
 * without rewriting itself under the cursor. A value arriving from anywhere
 * else, an undo or the playhead button, takes the field back: the typed text is
 * only kept while the value it produced is still the one in force.
 *
 * A position that is mistyped or out of bounds is refused rather than corrected:
 * the field says what is wrong and the setting keeps its last usable value, so
 * a trim is never quietly moved somewhere the operator did not ask for.
 */
export function TimecodeInput({
  seconds,
  onChange,
  withHours,
  placeholder,
  clearable,
  validate,
  onErrorChange,
  "aria-label": ariaLabel,
}: TimecodeInputProps) {
  const { colors, fonts } = useUITheme();
  const [typing, setTyping] = useState<TypingState | null>(null);
  const settled = seconds === null ? "" : formatTimecode(seconds, withHours);
  const live = typing?.seconds === seconds ? typing : null;
  const value = live ? live.text : settled;
  const error = live?.error ?? null;

  // Read through a ref so a caller passing an inline handler never re-runs the
  // report, and unmounting clears whatever this field was holding back.
  const report = useRef(onErrorChange);
  report.current = onErrorChange;
  useEffect(() => {
    report.current?.(error);
    return () => report.current?.(null);
  }, [error]);

  const reject = (text: string, message: string) =>
    setTyping({ text, seconds, error: message });

  const handleChange = (text: string) => {
    if (!text.trim()) {
      if (!clearable) {
        reject(text, `Enter a time as ${timecodeShape(withHours)}.`);
        return;
      }
      const message = validate?.(null) ?? null;
      setTyping({ text, seconds: message ? seconds : null, error: message });
      if (!message) onChange(null);
      return;
    }

    const parsed = parseTimecode(text, withHours);
    if (parsed === null) {
      // Half a timecode is on its way to being one; anything else is a typo.
      if (isPartialTimecode(text, withHours)) {
        setTyping({ text, seconds, error: null });
        return;
      }
      reject(
        text,
        `Write this as ${timecodeShape(withHours)}, with minutes and seconds from 00 to 59.`,
      );
      return;
    }

    const message = validate?.(parsed) ?? null;
    if (message) {
      reject(text, message);
      return;
    }
    setTyping({ text, seconds: parsed, error: null });
    onChange(parsed);
  };

  return (
    <>
      <TextInput
        type="text"
        inputMode="numeric"
        aria-label={ariaLabel}
        aria-invalid={error ? true : undefined}
        placeholder={placeholder ?? timecodeShape(withHours)}
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        onFocus={(event) => {
          if (error) event.target.style.borderColor = colors.danger;
        }}
        onBlur={(event) => {
          if (error) event.target.style.borderColor = colors.danger;
        }}
        style={{
          fontVariantNumeric: "tabular-nums",
          ...(error ? { borderColor: colors.danger } : {}),
        }}
      />
      {error && (
        <span
          role="alert"
          style={{
            display: "block",
            marginTop: 6,
            fontFamily: fonts.ui,
            fontSize: 11.5,
            lineHeight: 1.45,
            color: colors.danger,
            textTransform: "none",
            letterSpacing: 0,
          }}
        >
          {error}
        </span>
      )}
    </>
  );
}
