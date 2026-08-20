import type { PipPlacement } from "../../../types";
import { createLiveWindow } from "../../../lib/liveWindow";

/**
 * The camera-stream projection output. It reuses the shared live-window
 * controller (open on the external display, fullscreen, close-watch) exactly
 * like the slide presentation, and it also owns the bridge every projected
 * window reads its cameras through.
 *
 * A slide popup mirrors serialisable state over a BroadcastChannel, but a live
 * MediaStream can't be cloned across one. It can, however, be shared by
 * reference between same-origin windows: this window registers what is being
 * shown on `window.__wsStreamLive` and a popup reads it back through
 * `window.opener`. No media is copied or re-encoded; the popup simply points a
 * <video> at the very same stream object.
 *
 * The bridge carries a whole composition rather than one stream, because a
 * broadcast can be several cameras at once: one filling the screen and up to two
 * more in corner windows. `version` is bumped on every change so a reader can
 * poll cheaply instead of the two windows holding callbacks into each other,
 * which is the arrangement that breaks the moment one of them is closed
 * abruptly mid-service.
 */

const STREAM_WINDOW_NAME = "worship-studio-stream-output";

/** One camera in a corner of the projected picture. */
export interface LiveStreamWindow {
  id: string;
  label: string;
  stream: MediaStream | null;
  placement: PipPlacement;
  muted: boolean;
}

export interface LiveComposition {
  /** The camera filling the screen. */
  primary: MediaStream | null;
  secondaries: LiveStreamWindow[];
}

export const EMPTY_LIVE_COMPOSITION: LiveComposition = {
  primary: null,
  secondaries: [],
};

export interface StreamLiveBridge {
  /** Bumped on every change, so a reader can skip work when nothing moved. */
  version: number;
  getComposition: () => LiveComposition;
}

let composition: LiveComposition = EMPTY_LIVE_COMPOSITION;
let version = 0;

export const streamLiveWindow = createLiveWindow(
  "/stream-live",
  STREAM_WINDOW_NAME,
);

declare global {
  interface Window {
    __wsStreamLive?: StreamLiveBridge;
  }
}

function install(): void {
  version += 1;
  window.__wsStreamLive = {
    version,
    getComposition: () => composition,
  };
}

/** Publishes (or clears) everything the projection popups should display. */
export function setLiveComposition(next: LiveComposition | null): void {
  composition = next ?? EMPTY_LIVE_COMPOSITION;
  install();
}

/** The single-camera case, used by the offline QR flow and by any one caller
 *  that only has a main picture to publish. */
export function setLiveStream(stream: MediaStream | null): void {
  setLiveComposition(stream ? { primary: stream, secondaries: [] } : null);
}

export function getLiveComposition(): LiveComposition {
  return composition;
}
