import { useCallback, useState } from "react";
import type { ValidationIssue } from "../lib/validation";

export interface Validation {
  /** Everything currently wrong, derived rules first, then live field errors. */
  issues: ValidationIssue[];
  invalid: boolean;
  /** What to lead with when a save is refused. */
  message: string | null;
  messageFor: (field: string) => string | null;
  /**
   * Reports, or clears, an error raised by a control that validates as it is
   * typed into and so cannot be derived from the draft (a timecode field keeps
   * the last usable value, and only the field knows what was typed over it).
   */
  reportIssue: (field: string, message: string | null) => void;
}

/**
 * Gathers everything wrong with an editor's draft into one answer, so the save
 * control, the message beside each field and the refusal toast all read from
 * the same place instead of each deciding for themselves.
 *
 * `derived` holds the rules that can be checked against the draft on every
 * render; anything a control has to report for itself arrives through
 * `reportIssue`.
 */
export function useValidation(
  derived: Record<string, string | null> = {},
): Validation {
  const [reported, setReported] = useState<Record<string, string>>({});

  const reportIssue = useCallback((field: string, message: string | null) => {
    setReported((current) => {
      if ((current[field] ?? null) === message) return current;
      const next = { ...current };
      if (message) next[field] = message;
      else delete next[field];
      return next;
    });
  }, []);

  const issues: ValidationIssue[] = [
    ...Object.entries(derived).flatMap(([field, message]) =>
      message ? [{ field, message }] : [],
    ),
    ...Object.entries(reported).map(([field, message]) => ({
      field,
      message,
    })),
  ];

  return {
    issues,
    invalid: issues.length > 0,
    message: issues[0]?.message ?? null,
    messageFor: (field) =>
      issues.find((issue) => issue.field === field)?.message ?? null,
    reportIssue,
  };
}
