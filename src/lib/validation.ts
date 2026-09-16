export interface ValidationIssue {
  field: string;
  message: string;
}

export const NAME_MAX_LENGTH = 120;

export const validateName = (value: string, label: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return `Enter a ${label}.`;
  if (trimmed.length > NAME_MAX_LENGTH)
    return `A ${label} can be at most ${NAME_MAX_LENGTH} characters.`;
  return null;
};
