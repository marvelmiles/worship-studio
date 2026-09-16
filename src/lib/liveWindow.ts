import { PRESENT_WINDOW_NAME } from "./presentChannel";

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

export const isExtendedDisplay = (): boolean => {
  try {
    return Boolean(
      (window.screen as unknown as { isExtended?: boolean }).isExtended,
    );
  } catch {
    return false;
  }
};

const defaultFeatures = (
  left?: number,
  top?: number,
  width?: number,
  height?: number,
): string => {
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
};

const placeOnExternalDisplay = async (opened: Window): Promise<void> => {
  const getScreenDetails = (
    window as unknown as { getScreenDetails?: () => Promise<ScreenDetails> }
  ).getScreenDetails;
  if (typeof getScreenDetails !== "function") return;
  try {
    const details = await getScreenDetails();
    const external =
      details.screens.find(
        (s) => s.isInternal === false && s !== details.currentScreen,
      ) || details.screens.find((s) => s !== details.currentScreen);
    if (!external || opened.closed) return;
    opened.moveTo(external.left, external.top);
    opened.resizeTo(external.width, external.height);
    void opened.document.documentElement.requestFullscreen?.().catch(() => {});
  } catch {}
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

  const goLive = (): GoLiveResult => {
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

    void placeOnExternalDisplay(opened);

    return { ok: true };
  };

  const toggleFullscreen = async (): Promise<boolean> => {
    if (!win || win.closed) return false;
    try {
      if (win.document.fullscreenElement) await win.document.exitFullscreen();
      else await win.document.documentElement.requestFullscreen();
      return true;
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
  "/present",
  PRESENT_WINDOW_NAME,
);
