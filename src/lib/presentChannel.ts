import type {
  ContentKind,
  MediaItem,
  PipPlacement,
  PresentationView,
  SlideDeckDoc,
} from "../types";

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

/**
 * A second module shown in a corner of the stage while the main one runs: a
 * picture, a clip, or the live camera the stream module is receiving.
 *
 * The picture and the clip travel whole for the same reason the main deck does,
 * so the operator's version reaches the audience without a save behind it. The
 * camera cannot travel at all: a MediaStream is not clonable, so the projected
 * window reads it by reference from its opener (see stream/lib/streamLive.ts)
 * and this only says that it is the camera being shown.
 */
export interface SecondaryPresentState {
  kind: SecondaryModuleKind;
  id: string;
  item?: MediaItem;
  placement: PipPlacement;
  muted: boolean;
  media?: MediaPlayback;
}

/** What a secondary window can show alongside the main presentation. */
export type SecondaryModuleKind = "image" | "video" | "stream";

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
  /**
   * The picture or clip being projected, sent for the same reason as `doc`: the
   * operator's version reaches the audience without a save behind it. Metadata
   * only, the file itself is read from storage by id.
   */
  item?: MediaItem;
  slideIndex: number;
  paused: boolean;
  zoom: number;
  pan: { x: number; y: number };
  view: PresentationView;
  media?: MediaPlayback;
  secondary?: SecondaryPresentState;
}

/**
 * Where the operator's clip actually is, sent on a tick of its own.
 *
 * The projected window runs its own video element, so nothing but a shared
 * clock keeps the two pictures together: a seek alone cannot, because each
 * element buffers and starts on its own schedule. `at` is the wall clock the
 * reading was taken at, which lets the receiver add the time the message spent
 * in flight before deciding whether it has drifted.
 */
export interface MediaSync {
  time: number;
  at: number;
  playing: boolean;
  rate: number;
}

/** How far the projected clip may drift before it is pulled back into line. */
export const MEDIA_SYNC_TOLERANCE_SECONDS = 0.35;

/** How often the operator publishes where the clip has got to. */
export const MEDIA_SYNC_INTERVAL_MS = 500;

/** The playhead a sync describes, carried forward to now. */
export const syncedPosition = (sync: MediaSync): number =>
  sync.time +
  (sync.playing ? ((Date.now() - sync.at) / 1000) * (sync.rate || 1) : 0);

/** Which of the projected window's clips a position reading belongs to. */
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

/** Thin wrapper so both windows share one message shape for the live-output link. */
export function openPresentChannel(
  onMessage: (msg: PresentMessage) => void,
): BroadcastChannel {
  const channel = new BroadcastChannel(PRESENT_CHANNEL_NAME);
  channel.onmessage = (e: MessageEvent<PresentMessage>) => onMessage(e.data);
  return channel;
}
