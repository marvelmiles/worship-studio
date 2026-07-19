import { PRESENT_WINDOW_NAME } from "./presentChannel";

/**
 * Owns the projected "Go Live" popup for the whole app.
 *
 * This is deliberately a module singleton rather than component state: going
 * live has to happen inside the real click that requested it (browsers only
 * honour window.open during a user gesture), but the presentation UI that
 * reflects and controls the live window mounts separately. Both talk to this.
 */

export interface LiveWindowState {
  isLive: boolean;
  isFullscreen: boolean;
}

export interface GoLiveResult {
  ok: boolean;
  reason?: "no-external" | "unsupported" | "blocked" | "error";
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

export function subscribeLiveWindow(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Stable snapshot; identity only changes when the state actually changes. */
export function getLiveWindowState(): LiveWindowState {
  return state;
}

export function isExtendedDisplay(): boolean {
  try {
    return Boolean((window.screen as unknown as { isExtended?: boolean }).isExtended);
  } catch {
    return false;
  }
}

function stopWatchingClose(): void {
  window.clearInterval(closeWatcher);
  closeWatcher = undefined;
}

export function endLive(): void {
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
export function goLive(): GoLiveResult {
  if (win && !win.closed) {
    setState({ isLive: true });
    return { ok: true };
  }

  const opened = window.open("/present", PRESENT_WINDOW_NAME, defaultFeatures());
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

/**
 * Fullscreening the popup needs a gesture the browser may no longer honour,
 * so this can resolve false. Callers then point the user at the fullscreen
 * button inside the popup, where a real click always works.
 */
export async function toggleLiveFullscreen(): Promise<boolean> {
  if (!win || win.closed) return false;
  try {
    if (win.document.fullscreenElement) await win.document.exitFullscreen();
    else await win.document.documentElement.requestFullscreen();
    return true;
  } catch {
    return false;
  }
}
