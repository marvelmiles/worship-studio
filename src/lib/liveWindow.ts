import { PRESENT_WINDOW_NAME } from "./presentChannel";

/**
 * Owns a projected "Go Live" popup for the whole app.
 *
 * Deliberately a module-level singleton per output rather than component state:
 * going live has to happen inside the real click that requested it (browsers
 * only honour window.open during a user gesture), but the UI that reflects and
 * controls the live window mounts separately. Both talk to a controller here.
 *
 * `createLiveWindow` makes one such controller for a given route + window name,
 * so the same open / place-on-external-display / fullscreen / close-watch logic
 * is shared between the slide presentation (`/present`) and the camera stream
 * (`/stream-live`). What each popup *shows* differs; how the window is managed
 * does not.
 */

export interface LiveWindowState {
  isLive: boolean;
  isFullscreen: boolean;
}

export interface GoLiveResult {
  ok: boolean;
  reason?: "no-external" | "unsupported" | "blocked" | "error";
}

export interface LiveWindowController {
  goLive: () => GoLiveResult;
  endLive: () => void;
  toggleFullscreen: () => Promise<boolean>;
  subscribe: (listener: () => void) => () => void;
  getState: () => LiveWindowState;
}

interface ScreenDetailed {
  left: number;
  top: number;
  width: number;
  height: number;
  isPrimary?: boolean;
  isInternal?: boolean;
}

interface ScreenDetails {
  screens: ScreenDetailed[];
  currentScreen: ScreenDetailed;
}

type Listener = () => void;

export function isExtendedDisplay(): boolean {
  try {
    return Boolean((window.screen as unknown as { isExtended?: boolean }).isExtended);
  } catch {
    return false;
  }
}

function defaultFeatures(left?: number, top?: number, width?: number, height?: number): string {
  return [
    `left=${left ?? window.screen.width}`,
    `top=${top ?? 0}`,
    `width=${width ?? 1280}`,
    `height=${height ?? 720}`,
    "toolbar=no",
    "location=no",
    "menubar=no",
    "status=no",
    "scrollbars=no",
    "resizable=yes",
  ].join(",");
}

async function placeOnExternalDisplay(opened: Window): Promise<void> {
  const getScreenDetails = (window as unknown as { getScreenDetails?: () => Promise<ScreenDetails> })
    .getScreenDetails;
  if (typeof getScreenDetails !== "function") return;
  try {
    const details = await getScreenDetails();
    const external =
      details.screens.find((s) => s.isInternal === false && s !== details.currentScreen) ||
      details.screens.find((s) => s !== details.currentScreen);
    if (!external || opened.closed) return;
    opened.moveTo(external.left, external.top);
    opened.resizeTo(external.width, external.height);
    void opened.document.documentElement.requestFullscreen?.().catch(() => {});
  } catch {
    /* permission denied or single display; the popup stays where it opened */
  }
}

/** Creates an independent live-window controller for one output route. */
export function createLiveWindow(route: string, windowName: string): LiveWindowController {
  let win: Window | null = null;
  let state: LiveWindowState = { isLive: false, isFullscreen: false };
  let closeWatcher: number | undefined;
  const listeners = new Set<Listener>();

  function setState(next: Partial<LiveWindowState>): void {
    const merged = { ...state, ...next };
    if (merged.isLive === state.isLive && merged.isFullscreen === state.isFullscreen) return;
    state = merged;
    for (const listener of listeners) listener();
  }

  function stopWatchingClose(): void {
    window.clearInterval(closeWatcher);
    closeWatcher = undefined;
  }

  function endLive(): void {
    stopWatchingClose();
    try {
      win?.close();
    } catch {
      /* window may already be gone */
    }
    win = null;
    setState({ isLive: false, isFullscreen: false });
  }

  /**
   * Opens the projection window on the external display when the Window
   * Management API can place it there, falling back to a plain popup the
   * operator drags across themselves. Must be called synchronously from a user
   * gesture, so screen detection runs *after* the window is opened.
   */
  function goLive(): GoLiveResult {
    if (win && !win.closed) {
      setState({ isLive: true });
      return { ok: true };
    }

    const opened = window.open(route, windowName, defaultFeatures());
    if (!opened) return { ok: false, reason: "blocked" };

    win = opened;
    setState({ isLive: true });

    opened.addEventListener("load", () => {
      try {
        opened.document.addEventListener("fullscreenchange", () => {
          setState({ isFullscreen: Boolean(opened.document.fullscreenElement) });
        });
        setState({ isFullscreen: Boolean(opened.document.fullscreenElement) });
      } catch {
        /* cross-origin or window gone; ignore */
      }
    });

    closeWatcher = window.setInterval(() => {
      if (win?.closed) {
        win = null;
        stopWatchingClose();
        setState({ isLive: false, isFullscreen: false });
      }
    }, 800);

    // Placement needs an async permission check, so it lands just after the
    // window exists. The popup is already open and usable either way.
    void placeOnExternalDisplay(opened);

    return { ok: true };
  }

  /**
   * Fullscreening the popup needs a gesture the browser may no longer honour,
   * so this can resolve false. Callers then point the user at the fullscreen
   * button inside the popup, where a real click always works.
   */
  async function toggleFullscreen(): Promise<boolean> {
    if (!win || win.closed) return false;
    try {
      if (win.document.fullscreenElement) await win.document.exitFullscreen();
      else await win.document.documentElement.requestFullscreen();
      return true;
    } catch {
      return false;
    }
  }

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
}

/** The slide-presentation output. Its API is also re-exported below for the
 *  existing callers that predate the factory. */
export const presentLiveWindow = createLiveWindow("/present", PRESENT_WINDOW_NAME);

export const goLive = presentLiveWindow.goLive;
export const endLive = presentLiveWindow.endLive;
export const toggleLiveFullscreen = presentLiveWindow.toggleFullscreen;
export const subscribeLiveWindow = presentLiveWindow.subscribe;
export const getLiveWindowState = presentLiveWindow.getState;
