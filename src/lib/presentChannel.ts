import type {
  ContentKind,
  MediaItem,
  PipPlacement,
  PresentationView,
  SlideDeckDoc,
} from "../types";

export const PRESENT_CHANNEL_NAME = "worship-studio-present";
export const PRESENT_WINDOW_NAME = "worship-studio-live-output";

export interface MediaPlayback {
  playing: boolean;
  muted: boolean;
  volume: number;
  seekTime: number;
  seekToken: number;
}

export interface SecondaryPresentState {
  kind: SecondaryModuleKind;
  id: string;
  item?: MediaItem;
  placement: PipPlacement;
  muted: boolean;
  media?: MediaPlayback;
}

export type SecondaryModuleKind = "image" | "video" | "stream";

export interface PresentState {
  kind: ContentKind;
  id: string;
  rev?: string;
  doc?: SlideDeckDoc;
  item?: MediaItem;
  slideIndex: number;
  paused: boolean;
  zoom: number;
  pan: { x: number; y: number };
  view: PresentationView;
  media?: MediaPlayback;
  secondary?: SecondaryPresentState;
}

export interface MediaSync {
  time: number;
  at: number;
  playing: boolean;
  rate: number;
}

export const MEDIA_SYNC_TOLERANCE_SECONDS = 0.35;

export const MEDIA_SYNC_INTERVAL_MS = 500;

export const syncedPosition = (sync: MediaSync): number =>
  sync.time +
  (sync.playing ? ((Date.now() - sync.at) / 1000) * (sync.rate || 1) : 0);

export type MediaSyncTarget = "main" | "secondary";

export type PresentMessage =
  | { type: "state"; state: PresentState }
  | { type: "media-sync"; sync: MediaSync; target?: MediaSyncTarget }
  | { type: "request-state" }
  | { type: "bye" };

export const DEFAULT_MEDIA_PLAYBACK: MediaPlayback = {
  playing: true,
  muted: false,
  volume: 100,
  seekTime: 0,
  seekToken: 0,
};

export const openPresentChannel = (
  onMessage: (msg: PresentMessage) => void,
): BroadcastChannel => {
  const channel = new BroadcastChannel(PRESENT_CHANNEL_NAME);
  channel.onmessage = (e: MessageEvent<PresentMessage>) => onMessage(e.data);
  return channel;
};
