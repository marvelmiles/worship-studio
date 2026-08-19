/**
 * One thing wrong with a draft, named by the field it belongs to so the editor
 * can put the message beside the control that raised it and refuse the save
 * with the same words.
 */
export interface ValidationIssue {
  field: string;
  message: string;
}

/** Long enough for any title a service uses, short enough to stay readable. */
export const NAME_MAX_LENGTH = 120;

/**
 * The rules every name in the studio answers to: a document has to be called
 * something, and the something has to fit. `label` names the field in the
 * message, so a manuscript is told to enter a title and a clip a name.
 */
export function validateName(value: string, label: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return `Enter a ${label}.`;
  if (trimmed.length > NAME_MAX_LENGTH)
    return `A ${label} can be at most ${NAME_MAX_LENGTH} characters.`;
  return null;
}
