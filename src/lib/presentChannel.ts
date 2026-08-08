import type { ContentKind, PresentationView, SlideDeckDoc } from "../types";

export const PRESENT_CHANNEL_NAME = "worship-studio-present";
export const PRESENT_WINDOW_NAME = "worship-studio-live-output";

/** Operator-driven playback state mirrored onto media (video) slides. */
export interface MediaPlayback {
  playing: boolean;
  muted: boolean;
  volume: number;
  /** Target time in seconds; applied when `seekToken` changes. */
  seekTime: number;
  seekToken: number;
}

export interface PresentState {
  kind: ContentKind;
  id: string;
  /** Last-updated stamp of the presented doc so the popup can spot stale data. */
  rev?: string;
  /**
   * The text deck being projected, sent whole so the popup shows exactly what
   * the operator applied even when the library has not been given it yet.
   */
  doc?: SlideDeckDoc;
  slideIndex: number;
  paused: boolean;
  zoom: number;
  pan: { x: number; y: number };
  view: PresentationView;
  media?: MediaPlayback;
}

export type PresentMessage =
  | { type: "state"; state: PresentState }
  | { type: "request-state" }
  | { type: "bye" };

export const DEFAULT_MEDIA_PLAYBACK: MediaPlayback = {
  playing: true,
  muted: false,
  volume: 100,
  seekTime: 0,
  seekToken: 0,
};

/** Thin wrapper so both windows share one message shape for the live-output link. */
export function openPresentChannel(
  onMessage: (msg: PresentMessage) => void,
): BroadcastChannel {
  const channel = new BroadcastChannel(PRESENT_CHANNEL_NAME);
  channel.onmessage = (e: MessageEvent<PresentMessage>) => onMessage(e.data);
  return channel;
}
