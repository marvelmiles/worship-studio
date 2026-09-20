import { PRESENT_WINDOW_NAME } from "./presentChannel";
import {
  externalPlacement,
  isExtendedDisplay,
  isOnPlacement,
  moveToPlacement,
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
  /** On this display: one screen, or the browser would not place it. */
  | "same-screen";

export interface GoLiveResult {
  ok: boolean;
  reason?: "blocked" | "error";
  placement: GoLivePlacement;
  /** Whether this device has another display at all. */
  isExtended: boolean;
}

export interface LiveWindowController {
  goLive: () => Promise<GoLiveResult>;
  endLive: () => void;
  toggleFullscreen: () => Promise<boolean>;
  subscribe: (listener: () => void) => () => void;
  getState: () => LiveWindowState;
}

type Listener = () => void;

/* popup=yes keeps this a window rather than a tab: a tab cannot be put on
   another display, and cannot fill one on its own. */
const windowFeatures = (placement: ScreenPlacement | null): string =>
  [
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

  const endLive = (): void => {
    stopWatchingClose();
    try {
      win?.close();
    } catch {}
    win = null;
    setState({ isLive: false, isFullscreen: false });
  };

  const goLive = async (): Promise<GoLiveResult> => {
    const isExtended = isExtendedDisplay();

    /* Asked for before the window is opened, because opening a window spends
       the click, and after it nothing may ask to place windows any more. A
       device that has not granted that yet answers nothing here and the live
       window sorts itself out from the inside instead. */
    const placement = isExtended ? await externalPlacement() : null;

    const standing = win && !win.closed ? win : null;
    if (standing) {
      /* Going live again is how a person retries once they have allowed this
         site to place windows. A window that is already filling the wrong
         screen cannot be walked across to the right one, so it is opened
         again where it belongs; the live window asks for the running order
         back as soon as it loads. */
      if (!placement || isOnPlacement(standing, placement)) {
        setState({ isLive: true });
        standing.focus();
        return {
          ok: true,
          placement: placement ? "external" : placementOfWindow(standing),
          isExtended,
        };
      }
      endLive();
    }

    const opened = window.open(route, windowName, windowFeatures(placement));
    if (!opened) {
      return {
        ok: false,
        reason: "blocked",
        placement: "same-screen",
        isExtended,
      };
    }

    win = opened;
    setState({ isLive: true });

    /* Some browsers take the position on open, some ignore it and some land
       the window half on each display, so it is pushed into place as well. */
    if (placement) {
      moveToPlacement(opened, placement);
      whenLoaded(opened, () => {
        if (!opened.closed && !isOnPlacement(opened, placement)) {
          moveToPlacement(opened, placement);
        }
      });
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
        setState({ isLive: false, isFullscreen: false });
      }
    }, 800);

    return {
      ok: true,
      placement: placement ? "external" : placementOfWindow(opened),
      isExtended,
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
