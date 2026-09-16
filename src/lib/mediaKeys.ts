export const MEDIA_SURFACE_ATTR = "data-media-surface";

export const mediaSurfaceProps = { [MEDIA_SURFACE_ATTR]: "" } as const;

const MEDIA_SURFACE_SELECTOR = `[${MEDIA_SURFACE_ATTR}]`;

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

export const isTextEntryTarget = (target: EventTarget | null): boolean => {
  const element = asElement(target);
  if (!element) return false;
  if (element.isContentEditable) return true;
  const tag = element.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag !== "INPUT") return false;
  return !NON_TEXT_INPUT_TYPES.has((element as HTMLInputElement).type);
};

export const isInsideMediaSurface = (target: EventTarget | null): boolean => {
  return Boolean(asElement(target)?.closest(MEDIA_SURFACE_SELECTOR));
};

export const activatesOnSpace = (target: EventTarget | null): boolean => {
  return Boolean(asElement(target)?.closest(SPACE_ACTIVATED_SELECTOR));
};

export const clipOwnsSpace = (event: KeyboardEvent): boolean => {
  if (!isSpaceKey(event.key)) return false;
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  if (isTextEntryTarget(event.target)) return false;
  if (isInsideMediaSurface(event.target)) return true;
  return !activatesOnSpace(event.target);
};

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

export const isSliderTarget = (target: EventTarget | null): boolean => {
  const element = asElement(target);
  return (
    element?.tagName === "INPUT" &&
    ((element as HTMLInputElement).type === "range" ||
      element.getAttribute("role") === "slider")
  );
};

export const targetOwnsKey = (event: KeyboardEvent): boolean => {
  if (isTextEntryTarget(event.target)) return true;
  return isSliderTarget(event.target) && SLIDER_OWNED_KEYS.has(event.key);
};
