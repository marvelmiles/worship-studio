/**
 * Placing a window on the projector.
 *
 * A browser will not hand a page another display for free: `window.open` and
 * `moveTo` are clamped to the screen the page is on until the site holds the
 * window-management permission, and the only call that can ask for it needs a
 * fresh click behind it. Everything here is built around those two rules.
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

const WINDOW_MANAGEMENT = "window-management" as PermissionName;

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

/**
 * Whether this site may already place windows on other displays. Asking does
 * not prompt and does not need a click, so it is safe to check first.
 */
export const canPlaceWindows = async (): Promise<boolean> => {
  if (cached) return true;
  try {
    const status = await navigator.permissions?.query({
      name: WINDOW_MANAGEMENT,
    });
    return status?.state === "granted";
  } catch {
    return false;
  }
};

/**
 * The displays attached to this device. The first call prompts, so it must be
 * made while a click is still fresh; later calls answer straight away.
 */
export const readScreenDetails = async (): Promise<ScreenDetails | null> => {
  if (cached) return cached;
  const getScreenDetails = (window as ScreenDetailsWindow).getScreenDetails;
  if (!getScreenDetails) return null;
  try {
    cached = await getScreenDetails.call(window);
    return cached;
  } catch {
    return null;
  }
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

/** Where a window has to sit to fill that display, taskbars kept clear. */
const placementOf = (screen: ScreenDetailed): ScreenPlacement => ({
  left: screen.availLeft ?? screen.left,
  top: screen.availTop ?? screen.top,
  width: screen.availWidth ?? screen.width,
  height: screen.availHeight ?? screen.height,
});

/**
 * Where to open the live window, or nothing when this device has one display,
 * the browser cannot say, or the site may not place windows yet. Nothing is
 * ever asked for here: a prompt would eat the click the window needs.
 */
export const externalPlacement = async (): Promise<ScreenPlacement | null> => {
  if (!hasScreenDetails()) return null;
  if (!(await canPlaceWindows())) return null;
  const details = await readScreenDetails();
  if (!details) return null;
  const screen = pickProjectorScreen(details);
  return screen ? placementOf(screen) : null;
};

/** Whether a window is standing on the display this placement describes. */
export const isOnPlacement = (
  target: Window,
  placement: ScreenPlacement,
): boolean => {
  try {
    const x = target.screenX;
    const y = target.screenY;
    return (
      x >= placement.left - 1 &&
      y >= placement.top - 1 &&
      x < placement.left + placement.width &&
      y < placement.top + placement.height
    );
  } catch {
    return false;
  }
};

export const moveToPlacement = (
  target: Window,
  placement: ScreenPlacement,
): void => {
  try {
    target.moveTo(placement.left, placement.top);
    target.resizeTo(placement.width, placement.height);
  } catch {
    return;
  }
};

const fillThisScreen = async (element: HTMLElement): Promise<boolean> => {
  try {
    await element.requestFullscreen();
    return true;
  } catch {
    return false;
  }
};

/**
 * Fills the projector with this page.
 *
 * Called from the window that was just opened, which still carries the click
 * that opened it. Where this site may already place windows, the display is
 * named in the request and the picture lands on the projector even if the
 * window itself opened on the laptop. Where it may not, this screen is filled
 * straight away, while the click still counts, and the permission is asked for
 * afterwards so the next Go Live can reach the projector.
 */
export const fullscreenOnExternalScreen = async (
  element: HTMLElement,
): Promise<boolean> => {
  if (!isExtendedDisplay() || !hasScreenDetails()) {
    return fillThisScreen(element);
  }

  if (await canPlaceWindows()) {
    const details = await readScreenDetails();
    const screen = details ? pickProjectorScreen(details) : null;
    if (screen) {
      try {
        await element.requestFullscreen({ screen } as FullscreenOptions);
        return true;
      } catch {
        /* Some builds refuse the display option rather than ignoring it. */
      }
    }
    return fillThisScreen(element);
  }

  const filled = await fillThisScreen(element);
  void readScreenDetails();
  return filled;
};
