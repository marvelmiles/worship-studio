/**
 * Placing a window on the projector.
 *
 * A browser will not hand a page another display for free: `window.open` and
 * `moveTo` are clamped to the screen the page is on until the site holds the
 * window-management permission, and the only call that can ask for it needs a
 * click that has not been spent yet. Opening a window spends one, and so does
 * a fullscreen request, so the order these run in decides whether the picture
 * ever reaches the television.
 */

export interface ScreenDetailed {
  left: number;
  top: number;
  width: number;
  height: number;
  availLeft?: number;
  availTop?: number;
  availWidth?: number;
  availHeight?: number;
  isPrimary?: boolean;
  isInternal?: boolean;
  label?: string;
}

export interface ScreenDetails {
  screens: ScreenDetailed[];
  currentScreen: ScreenDetailed;
}

interface ScreenDetailsWindow extends Window {
  getScreenDetails?: () => Promise<ScreenDetails>;
}

export interface ScreenPlacement {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ProjectorScreen {
  /** Where the live window goes so it fills the display, taskbars kept clear. */
  placement: ScreenPlacement;
  /** The whole display, which is the area a fullscreen window covers. */
  bounds: ScreenPlacement;
  label: string;
  screen: ScreenDetailed;
}

/** Whether this site may place windows on another display, and if not, why. */
export type ScreenAccess = "unsupported" | "granted" | "prompt" | "denied";

/* Browsers that shipped this before it was renamed still answer to the old
   name and throw on the new one. */
const PERMISSION_NAMES = [
  "window-management",
  "window-placement",
] as unknown as PermissionName[];

export const isExtendedDisplay = (): boolean => {
  try {
    return Boolean(
      (window.screen as unknown as { isExtended?: boolean }).isExtended,
    );
  } catch {
    return false;
  }
};

export const hasScreenDetails = (): boolean =>
  typeof (window as ScreenDetailsWindow).getScreenDetails === "function";

/* The live object keeps itself up to date as displays come and go, so it is
   fetched once and then reused: asking again is what triggers a prompt. */
let cached: ScreenDetails | null = null;
let asking: Promise<ScreenDetails | null> | null = null;

/**
 * Where this site stands on using another display. Asking this question never
 * prompts and never needs a click, so it is safe to check first.
 */
export const screenAccess = async (): Promise<ScreenAccess> => {
  if (!hasScreenDetails()) return "unsupported";
  if (cached) return "granted";
  for (const name of PERMISSION_NAMES) {
    try {
      const status = await navigator.permissions?.query({ name });
      if (status?.state === "granted" || status?.state === "denied")
        return status.state;
      if (status) return "prompt";
    } catch {
      /* A browser that does not list the permission can still be asked for
         it, so an unknown name is a reason to keep looking, not to give up. */
    }
  }
  return "prompt";
};

/**
 * The displays attached to this device, asking the person for them the first
 * time on this origin.
 *
 * That first call only reaches the person while a click is still fresh, so it
 * has to run before anything that spends the click: opening a window, or
 * asking for fullscreen. A refusal is remembered by the browser, so a later
 * call answers nothing rather than pestering.
 */
export const readScreenDetails = async (): Promise<ScreenDetails | null> => {
  if (cached) return cached;
  const getScreenDetails = (window as ScreenDetailsWindow).getScreenDetails;
  if (!getScreenDetails) return null;
  asking ??= getScreenDetails
    .call(window)
    .then((details) => {
      cached = details;
      return details;
    })
    .catch(() => null)
    .finally(() => {
      asking = null;
    });
  return asking;
};

/**
 * The display to project onto: an external one before an internal one, and
 * never the one this page is on if there is any other choice.
 */
export const pickProjectorScreen = (
  details: ScreenDetails,
): ScreenDetailed | null => {
  const { screens, currentScreen } = details;
  const elsewhere = screens.filter((screen) => screen !== currentScreen);
  return (
    elsewhere.find(
      (screen) => screen.isInternal === false && screen.isPrimary === false,
    ) ??
    elsewhere.find((screen) => screen.isInternal === false) ??
    elsewhere.find((screen) => screen.isPrimary === false) ??
    elsewhere[0] ??
    null
  );
};

const boundsOf = (screen: ScreenDetailed): ScreenPlacement => ({
  left: screen.left,
  top: screen.top,
  width: screen.width,
  height: screen.height,
});

const placementOf = (screen: ScreenDetailed): ScreenPlacement => ({
  left: screen.availLeft ?? screen.left,
  top: screen.availTop ?? screen.top,
  width: screen.availWidth ?? screen.width,
  height: screen.availHeight ?? screen.height,
});

export const screenLabel = (screen: ScreenDetailed, index: number): string =>
  screen.label?.trim() ||
  (screen.isInternal ? "Built-in display" : `Display ${index + 1}`);

export const projectorScreenOf = (
  details: ScreenDetails,
): ProjectorScreen | null => {
  const screen = pickProjectorScreen(details);
  if (!screen) return null;
  return {
    placement: placementOf(screen),
    bounds: boundsOf(screen),
    label: screenLabel(screen, details.screens.indexOf(screen)),
    screen,
  };
};

/**
 * The projector, when this site may already place windows on it. Nothing is
 * ever asked for here: a prompt would spend the click a new window needs.
 */
export const knownProjectorScreen =
  async (): Promise<ProjectorScreen | null> => {
    if (!isExtendedDisplay()) return null;
    if ((await screenAccess()) !== "granted") return null;
    const details = await readScreenDetails();
    return details ? projectorScreenOf(details) : null;
  };

/** Whether a window is standing on the display this describes. */
export const isOnScreen = (
  target: Window,
  screen: ProjectorScreen,
): boolean => {
  try {
    const { left, top, width, height } = screen.bounds;
    const x = target.screenX;
    const y = target.screenY;
    return (
      x >= left - 1 && y >= top - 1 && x < left + width && y < top + height
    );
  } catch {
    return false;
  }
};

export const moveToScreen = (target: Window, screen: ProjectorScreen): void => {
  const { left, top, width, height } = screen.placement;
  try {
    target.moveTo(left, top);
    target.resizeTo(width, height);
  } catch {
    return;
  }
};

export interface ProjectorFill {
  /** Whether the window is filling a display rather than sitting in a frame. */
  isFullscreen: boolean;
  /** Whether the picture is on a display other than the one the app is on. */
  isOnProjector: boolean;
}

const fillThisScreen = async (element: HTMLElement): Promise<boolean> => {
  try {
    await element.requestFullscreen();
    return true;
  } catch {
    return false;
  }
};

/**
 * Fills the projector with this window.
 *
 * Runs from the window that was just opened, which still carries the click
 * that opened it. The displays are asked for before anything else, because a
 * fullscreen request spends that click and the browser then refuses to ask at
 * all, which is what leaves a laptop projecting onto its own screen forever.
 *
 * Once the display is known the window is walked onto it, which needs no click
 * of its own, so the picture reaches the projector even when the person took
 * long enough over the prompt for fullscreen to be refused.
 */
export const fillProjector = async (
  element: HTMLElement,
): Promise<ProjectorFill> => {
  const details = isExtendedDisplay() ? await readScreenDetails() : null;
  const projector = details ? projectorScreenOf(details) : null;

  if (!projector)
    return {
      isFullscreen: await fillThisScreen(element),
      isOnProjector: false,
    };

  if (!isOnScreen(window, projector)) moveToScreen(window, projector);

  try {
    await element.requestFullscreen({
      screen: projector.screen,
    } as FullscreenOptions);
    return { isFullscreen: true, isOnProjector: true };
  } catch {
    /* Some builds refuse the display option rather than ignoring it, and a
       window that has already been walked across fills the right display with
       a plain request anyway. */
  }
  return {
    isFullscreen: await fillThisScreen(element),
    isOnProjector: isOnScreen(window, projector),
  };
};
