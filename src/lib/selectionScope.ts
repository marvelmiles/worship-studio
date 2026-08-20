/**
 * Which controls count as "still working on the selected thing".
 *
 * A surface that frames an element only while it holds focus has to decide what
 * losing focus means. Clicking the picture beside the element means the operator
 * has moved on; clicking the settings for that very element does not. Marking
 * those controls is how the surface tells the two apart, and it lives here
 * rather than beside either of them because the control and the surface are in
 * different features.
 */

export const KEEPS_SELECTION_ATTRIBUTE = "data-keeps-selection";

/** Spread onto the root of a panel that drives the current selection. */
export const keepsSelectionProps = {
  [KEEPS_SELECTION_ATTRIBUTE]: "",
} as const;

/** Whether focus landing here should leave the current selection alone. */
export const keepsSelection = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  Boolean(target.closest(`[${KEEPS_SELECTION_ATTRIBUTE}]`));
