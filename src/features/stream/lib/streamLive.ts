import { createLiveWindow } from "../../../lib/liveWindow";

/**
 * The camera-stream projection output. It reuses the shared live-window
 * controller (open on the external display, fullscreen, close-watch) exactly
 * like the slide presentation — the only difference is what the popup shows.
 *
 * A slide popup mirrors serialisable state over a BroadcastChannel, but a live
 * MediaStream can't be cloned across one. It can, however, be shared by
 * reference between same-origin windows: the operator registers the current
 * stream on `window.__wsStreamLive` and the popup reads it back through
 * `window.opener`. No media is copied or re-encoded; the popup simply points a
 * <video> at the very same stream object.
 */

const STREAM_WINDOW_NAME = "worship-studio-stream-output";

export interface StreamLiveBridge {
  getStream: () => MediaStream | null;
}

declare global {
  interface Window {
    __wsStreamLive?: StreamLiveBridge;
  }
}

let current: MediaStream | null = null;

export const streamLiveWindow = createLiveWindow(
  "/stream-live",
  STREAM_WINDOW_NAME,
);

/** Publishes (or clears) the stream the projection popup should display. */
export function setLiveStream(stream: MediaStream | null): void {
  current = stream;
  window.__wsStreamLive = { getStream: () => current };
}
