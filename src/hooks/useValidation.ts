import { useCallback, useState } from "react";
import type { ValidationIssue } from "../lib/validation";

export interface Validation {
  issues: ValidationIssue[];
  invalid: boolean;
  message: string | null;
  messageFor: (field: string) => string | null;
  reportIssue: (field: string, message: string | null) => void;
}

export const useValidation = (
  derived: Record<string, string | null> = {},
): Validation => {
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
};
