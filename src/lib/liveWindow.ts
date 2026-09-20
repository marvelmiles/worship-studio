import { PRESENT_WINDOW_NAME } from "./presentChannel";
import {
  isExtendedDisplay,
  isOnScreen,
  knownProjectorScreen,
  moveToScreen,
  screenAccess,
  type ProjectorScreen,
  type ScreenAccess,
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
  reason?: "blocked" | "error";
  placement: GoLivePlacement;
  /** Whether this device has another display at all. */
  isExtended: boolean;
  /** Whether this site may put a window on that display yet. */
  access: ScreenAccess;
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

/* popup=yes keeps this a window rather than a tab: a tab cannot be put on
   another display, and cannot fill one on its own. */
const windowFeatures = (projector: ProjectorScreen | null): string => {
  const placement = projector?.placement;
  return [
    `left=${placement?.left ?? window.screen.width}`,
    `top=${placement?.top ?? 0}`,
    `width=${placement?.width ?? 1280}`,
    `height=${placement?.height ?? 720}`,
    "popup=yes",
    "toolbar=no",
    "location=no",
    "menubar=no",
    "status=no",
    "scrollbars=no",
    "resizable=yes",
  ].join(",");
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
        if (opened.closed || isOnScreen(opened, projector)) return;
        moveToScreen(opened, projector);
      }, delay);
      settleTimers.add(timer);
    }
  };

  const goLive = async (): Promise<GoLiveResult> => {
    const isExtended = isExtendedDisplay();

    /* Both answers are read before the window is opened, because opening one
       spends the click and nothing may ask to place windows afterwards. Only
       a site that already holds the permission gets a display here; the rest
       open where the browser allows and the live window asks from there. */
    const access = isExtended ? await screenAccess() : "unsupported";
    const projector = isExtended ? await knownProjectorScreen() : null;

    const standing = win && !win.closed ? win : null;
    if (standing) {
      /* Going live again is how a person retries once they have allowed this
         site to place windows. A window that is already filling the wrong
         screen cannot be walked across to the right one, so it is opened
         again where it belongs; the live window asks for the running order
         back as soon as it loads. */
      if (!projector || isOnScreen(standing, projector)) {
        setState({ isLive: true });
        standing.focus();
        return {
          ok: true,
          placement: settledPlacement(standing, projector, access),
          isExtended,
          access,
        };
      }
      endLive();
    }

    const opened = window.open(route, windowName, windowFeatures(projector));
    if (!opened) {
      return {
        ok: false,
        reason: "blocked",
        placement: "same-screen",
        isExtended,
        access,
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
