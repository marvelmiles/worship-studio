import { PRESENT_WINDOW_NAME } from "./presentChannel";
import {
  isExtendedDisplay,
  isOnScreen,
  knownCurrentScreen,
  knownProjectorScreen,
  moveToScreen,
  readScreenDetails,
  screenAccess,
  type ProjectorScreen,
  type ScreenAccess,
  type ScreenPlacement,
} from "./screens";
import routes from "../routes";

export { isExtendedDisplay };

export interface LiveWindowState {
  isLive: boolean;
  isFullscreen: boolean;
}

/** Where the live window ended up, as far as the browser would say. */
export type GoLivePlacement =
  /** Standing on another display, which is what going live is for. */
  | "external"
  /** On its way: the live window is asking for the projector as it loads. */
  | "pending"
  /** On this display: one screen, or the browser would not place it. */
  | "same-screen";

export interface GoLiveResult {
  ok: boolean;
  /** "retry" is a popup lost to the permission prompt, which the next press wins back. */
  reason?: "blocked" | "retry" | "error";
  placement: GoLivePlacement;
  /** Whether this device has another display at all. */
  isExtended: boolean;
  /** Whether this site may put a window on that display yet. */
  access: ScreenAccess;
  /** What the browser calls the display being projected onto. */
  display?: string;
}

export interface LiveWindowController {
  goLive: () => Promise<GoLiveResult>;
  endLive: () => void;
  toggleFullscreen: () => Promise<boolean>;
  subscribe: (listener: () => void) => () => void;
  getState: () => LiveWindowState;
}

type Listener = () => void;

/* A window that has just been opened does not always report its position at
   once, and Windows restores a popup to where it last stood before honouring
   the position it was opened with, so the placement is pressed again a couple
   of times while it settles. */
const SETTLE_DELAYS_MS = [0, 250, 800];

/**
 * How the live window is asked for.
 *
 * `popup` keeps this a window rather than a tab: a tab cannot be put on
 * another display, and cannot fill one on its own. `fullscreen` is the part
 * that puts the picture on the television: a site holding the window
 * management permission may open a popup already filling the display its
 * coordinates fall on, spending the one click for both. Asking a window to
 * fill a display from the inside, after it has opened, is refused, because by
 * then the click that opened it is gone.
 */
export const windowFeatures = (
  placement: ScreenPlacement,
  canFillOnOpen: boolean,
): string => {
  const features = [
    `left=${placement.left}`,
    `top=${placement.top}`,
    `width=${placement.width}`,
    `height=${placement.height}`,
    "popup=yes",
    "toolbar=no",
    "location=no",
    "menubar=no",
    "status=no",
    "scrollbars=no",
    "resizable=yes",
  ];
  if (canFillOnOpen) features.push("fullscreen");
  return features.join(",");
};

/* Where to put a window on a device whose displays the browser will not name.
   A second screen sits beside this one more often than not, so that is where
   it is aimed; with nowhere else to go it fills the screen it has. */
const guessedPlacement = (isExtended: boolean): ScreenPlacement =>
  isExtended
    ? { left: window.screen.width, top: 0, width: 1280, height: 720 }
    : {
        left: 0,
        top: 0,
        width: window.screen.availWidth,
        height: window.screen.availHeight,
      };

/* A window opened straight into fullscreen is where it belongs already, and
   nudging it would drop it back out of fullscreen. */
const isFillingScreen = (
  opened: Window,
  projector: ProjectorScreen,
): boolean => {
  try {
    if (opened.document.fullscreenElement) return true;
    return (
      opened.innerWidth >= projector.bounds.width - 2 &&
      opened.innerHeight >= projector.bounds.height - 2
    );
  } catch {
    return false;
  }
};

/* Without the window-management permission a browser will not say where a
   window is, so this only ever confirms what was asked for. */
const placementOfWindow = (opened: Window): GoLivePlacement => {
  try {
    return opened.screenX >= window.screen.width ||
      opened.screenY >= window.screen.height ||
      opened.screenX < 0 ||
      opened.screenY < 0
      ? "external"
      : "same-screen";
  } catch {
    return "same-screen";
  }
};

/**
 * Where the live window has landed, or will land.
 *
 * A window opened without the permission is asked to move by the live window
 * itself, which is the one place a browser will still take the question, so
 * until that has played out the answer is neither yes nor no.
 */
const settledPlacement = (
  opened: Window,
  projector: ProjectorScreen | null,
  access: ScreenAccess,
): GoLivePlacement => {
  if (projector) return "external";
  if (access === "prompt") return "pending";
  return placementOfWindow(opened);
};

const whenLoaded = (opened: Window, run: () => void): void => {
  try {
    if (opened.document.readyState === "complete") {
      run();
      return;
    }
  } catch {}
  opened.addEventListener("load", run, { once: true });
};

export const createLiveWindow = (
  route: string,
  windowName: string,
): LiveWindowController => {
  let win: Window | null = null;
  let state: LiveWindowState = { isLive: false, isFullscreen: false };
  let closeWatcher: number | undefined;
  const settleTimers = new Set<number>();
  const listeners = new Set<Listener>();

  const setState = (next: Partial<LiveWindowState>): void => {
    const merged = { ...state, ...next };
    if (
      merged.isLive === state.isLive &&
      merged.isFullscreen === state.isFullscreen
    )
      return;
    state = merged;
    for (const listener of listeners) listener();
  };

  const stopWatchingClose = (): void => {
    window.clearInterval(closeWatcher);
    closeWatcher = undefined;
  };

  const stopSettling = (): void => {
    for (const timer of settleTimers) window.clearTimeout(timer);
    settleTimers.clear();
  };

  const endLive = (): void => {
    stopWatchingClose();
    stopSettling();
    try {
      win?.close();
    } catch {}
    win = null;
    setState({ isLive: false, isFullscreen: false });
  };

  /* Pressed rather than set once: a window that is already filling the display
     is left alone, so this never fights the live window's own fullscreen. */
  const settleOnto = (opened: Window, projector: ProjectorScreen): void => {
    for (const delay of SETTLE_DELAYS_MS) {
      const timer = window.setTimeout(() => {
        settleTimers.delete(timer);
        if (opened.closed || isFillingScreen(opened, projector)) return;
        if (isOnScreen(opened, projector)) return;
        moveToScreen(opened, projector);
      }, delay);
      settleTimers.add(timer);
    }
  };

  const goLive = async (): Promise<GoLiveResult> => {
    const isExtended = isExtendedDisplay();

    /* The permission is asked for here, before anything else, because this is
       still the click the person just made: opening a window spends it, and
       from inside that window the browser will no longer take the question.
       Answering the prompt can outlast the click, so the window that follows
       may be blocked; that is what "retry" reports, and the second Go Live
       has the permission in hand and lands on the projector. */
    let access = await screenAccess();
    const wasAsked = access === "prompt";
    if (wasAsked) {
      await readScreenDetails();
      access = await screenAccess();
    }

    /* Without another display there is still a screen to fill: a television
       fed straight from HDMI usually mirrors this one. */
    const projector = await knownProjectorScreen();
    const target = projector ?? (await knownCurrentScreen());
    const canFillOnOpen = access === "granted";

    const standing = win && !win.closed ? win : null;
    if (standing) {
      /* Going live again is how a person retries once they have allowed this
         site to place windows. A window cannot be told to fill a display
         after the fact, so one sitting in a frame, or on the wrong screen, is
         opened again as a window that fills; the live window asks for the
         running order back as soon as it loads. */
      const isSettled = target
        ? isOnScreen(standing, target) && isFillingScreen(standing, target)
        : true;
      if (isSettled || !canFillOnOpen) {
        setState({ isLive: true });
        standing.focus();
        return {
          ok: true,
          placement: settledPlacement(standing, projector, access),
          isExtended,
          access,
          display: projector?.label,
        };
      }
      endLive();
    }

    const opened = window.open(
      route,
      windowName,
      windowFeatures(
        target?.placement ?? guessedPlacement(isExtended),
        canFillOnOpen && Boolean(target),
      ),
    );
    if (!opened) {
      return {
        ok: false,
        reason: wasAsked ? "retry" : "blocked",
        placement: "same-screen",
        isExtended,
        access,
        display: projector?.label,
      };
    }

    win = opened;
    setState({ isLive: true });

    /* Some browsers take the position on open, some ignore it and some land
       the window half on each display, so it is pushed into place as well. */
    if (projector) {
      settleOnto(opened, projector);
      whenLoaded(opened, () => settleOnto(opened, projector));
    }

    whenLoaded(opened, () => {
      try {
        opened.document.addEventListener("fullscreenchange", () => {
          setState({
            isFullscreen: Boolean(opened.document.fullscreenElement),
          });
        });
        setState({ isFullscreen: Boolean(opened.document.fullscreenElement) });
      } catch {}
    });

    closeWatcher = window.setInterval(() => {
      if (win?.closed) {
        win = null;
        stopWatchingClose();
        stopSettling();
        setState({ isLive: false, isFullscreen: false });
      }
    }, 800);

    return {
      ok: true,
      placement: settledPlacement(opened, projector, access),
      isExtended,
      access,
      display: projector?.label,
    };
  };

  /* The live window asks for fullscreen itself: only it can name the display
     to fill, and only it still carries the click that opened it. */
  const toggleFullscreen = async (): Promise<boolean> => {
    if (!win || win.closed) return false;
    try {
      if (win.document.fullscreenElement) {
        await win.document.exitFullscreen();
        return true;
      }
      win.focus();
      return false;
    } catch {
      return false;
    }
  };

  return {
    goLive,
    endLive,
    toggleFullscreen,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getState: () => state,
  };
};

export const presentLiveWindow = createLiveWindow(
  routes.presentWindow(),
  PRESENT_WINDOW_NAME,
);
