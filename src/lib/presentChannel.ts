import type { PresentationView } from "../types";

export const PRESENT_CHANNEL_NAME = "worship-studio-present";
export const PRESENT_WINDOW_NAME = "worship-studio-live-output";

export interface PresentState {
  songId: string;
  idx: number;
  paused: boolean;
  zoom: number;
  pan: { x: number; y: number };
  view: PresentationView;
}

export type PresentMessage =
  | { type: "state"; state: PresentState }
  | { type: "request-state" }
  | { type: "bye" };

/** Thin wrapper so both windows share one message shape for the live-output link. */
export function openPresentChannel(onMessage: (msg: PresentMessage) => void): BroadcastChannel {
  const channel = new BroadcastChannel(PRESENT_CHANNEL_NAME);
  channel.onmessage = (e: MessageEvent<PresentMessage>) => onMessage(e.data);
  return channel;
}
