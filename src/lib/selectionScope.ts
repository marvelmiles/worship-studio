export const KEEPS_SELECTION_ATTRIBUTE = "data-keeps-selection";

export const keepsSelectionProps = {
  [KEEPS_SELECTION_ATTRIBUTE]: "",
} as const;

export const keepsSelection = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  Boolean(target.closest(`[${KEEPS_SELECTION_ATTRIBUTE}]`));
