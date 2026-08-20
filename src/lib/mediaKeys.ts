/**
 * Which key presses belong to a clip, and which belong to whatever has focus.
 *
 * The awkward case is a transport control the operator has just used. Dragging
 * the level slider or tapping mute leaves that control focused, and every
 * keyboard rule written around "is this a form control?" then answers the space
 * bar with the control instead of the clip. Inside a player that is the wrong
 * answer: space plays and pauses in every other player on the machine, whatever
 * was last touched, and an operator mid-service should not have to click the
 * picture first to get it back.
 *
 * So a player marks its own box with `data-media-surface`, and space inside that
 * box is the clip's. Everywhere else the ordinary rules stand: a field being
 * typed in keeps every key, and a button keeps the space that activates it.
 */

export const MEDIA_SURFACE_ATTR = "data-media-surface";

/** Spread onto the container whose clip owns the transport keys. */
export const mediaSurfaceProps = { [MEDIA_SURFACE_ATTR]: "" } as const;

const MEDIA_SURFACE_SELECTOR = `[${MEDIA_SURFACE_ATTR}]`;

/**
 * Input types that carry no text. Everything else an `<input>` can be does, and
 * so owns every key typed into it.
 */
const NON_TEXT_INPUT_TYPES = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

/** Controls the space bar already activates, so it is not the clip's to take. */
const SPACE_ACTIVATED_SELECTOR = [
  "button",
  "summary",
  '[role="button"]',
  '[role="checkbox"]',
  '[role="switch"]',
  '[role="menuitem"]',
  'input[type="checkbox"]',
  'input[type="radio"]',
  'input[type="button"]',
  'input[type="submit"]',
  'input[type="reset"]',
  'input[type="file"]',
].join(", ");

export const isSpaceKey = (key: string): boolean =>
  key === " " || key === "Spacebar";

const asElement = (target: EventTarget | null): HTMLElement | null =>
  target instanceof HTMLElement ? target : null;

/** A field the user is typing into, which owns every key it is given. */
export function isTextEntryTarget(target: EventTarget | null): boolean {
  const element = asElement(target);
  if (!element) return false;
  if (element.isContentEditable) return true;
  const tag = element.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag !== "INPUT") return false;
  return !NON_TEXT_INPUT_TYPES.has((element as HTMLInputElement).type);
}

export function isInsideMediaSurface(target: EventTarget | null): boolean {
  return Boolean(asElement(target)?.closest(MEDIA_SURFACE_SELECTOR));
}

export function activatesOnSpace(target: EventTarget | null): boolean {
  return Boolean(asElement(target)?.closest(SPACE_ACTIVATED_SELECTOR));
}

/**
 * Whether this space press is the clip's to answer. Callers still decide which
 * clip, and are expected to `preventDefault` so a focused transport button is
 * not also activated by the same press.
 */
export function clipOwnsSpace(event: KeyboardEvent): boolean {
  if (!isSpaceKey(event.key)) return false;
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  if (isTextEntryTarget(event.target)) return false;
  if (isInsideMediaSurface(event.target)) return true;
  return !activatesOnSpace(event.target);
}

/**
 * Keys a focused slider answers itself: scrubbing the playhead and setting the
 * level are exactly what the arrows are there for, so a presentation listening
 * on the window leaves them where they landed. Space is never one of them,
 * which is what lets the clip claim it.
 */
const SLIDER_OWNED_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "PageUp",
  "PageDown",
]);

export function isSliderTarget(target: EventTarget | null): boolean {
  const element = asElement(target);
  return (
    element?.tagName === "INPUT" &&
    ((element as HTMLInputElement).type === "range" ||
      element.getAttribute("role") === "slider")
  );
}

/** Whether the focused control answers this key itself, ahead of any shortcut. */
export function targetOwnsKey(event: KeyboardEvent): boolean {
  if (isTextEntryTarget(event.target)) return true;
  return isSliderTarget(event.target) && SLIDER_OWNED_KEYS.has(event.key);
}
