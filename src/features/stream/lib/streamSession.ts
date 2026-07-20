import { useSyncExternalStore } from "react";
import { createReceiver, type PeerStatus, type ReceiverHandle } from "./peer";
import { requestStream, type CallHandle, type DeviceEntry } from "./signaling";
import { streamLiveWindow, setLiveStream } from "./streamLive";

/**
 * Owns the laptop's live camera connection for the whole app, the way
 * liveWindow.ts owns the projection popup. Keeping the RTCPeerConnection and its
 * MediaStream in a module singleton (not a route component) is what lets the
 * projection survive navigation: the operator can pop the video out and move
 * around the app, and the stream keeps running because nothing here unmounts.
 *
 * "stage" shows the full-screen projection overlay; "pip" shrinks it into the
 * floating, draggable window. Both are rendered once at the app root from this
 * state (see StreamProjectionRoot).
 */

export type StreamMode = "stage" | "pip";

export interface StreamSessionState {
  active: boolean;
  deviceId: string | null;
  deviceName: string;
  status: PeerStatus;
  stream: MediaStream | null;
  wantAudio: boolean;
  mode: StreamMode;
}

const IDLE: StreamSessionState = {
  active: false,
  deviceId: null,
  deviceName: "",
  status: "idle",
  stream: null,
  wantAudio: false,
  mode: "stage",
};

let state: StreamSessionState = IDLE;
let handle: ReceiverHandle | null = null;
let call: CallHandle | null = null;
let answered = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}
function setState(patch: Partial<StreamSessionState>): void {
  state = { ...state, ...patch };
  emit();
}

export function subscribeStreamSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function getStreamSessionState(): StreamSessionState {
  return state;
}

/** React binding — stable snapshot identity, changes only when state changes. */
export function useStreamSession(): StreamSessionState {
  return useSyncExternalStore(subscribeStreamSession, getStreamSessionState);
}

export function setStreamMode(mode: StreamMode): void {
  if (state.active) setState({ mode });
}

/** Tears down the connection and any projection, without touching `state`. */
function teardown(): void {
  void call?.close().catch(() => {});
  handle?.close();
  call = null;
  handle = null;
  answered = false;
  if (streamLiveWindow.getState().isLive) streamLiveWindow.endLive();
  setLiveStream(null);
}

/** Ends the session — closes the projection, the PiP and the connection. */
export function endStreamSession(): void {
  if (!state.active && !handle) return;
  teardown();
  state = IDLE;
  emit();
}

/**
 * Connects to a chosen broadcasting device and becomes the app-wide session.
 * Any existing session is replaced. A dropped or failed connection ends the
 * session, which closes the projection/PiP — a device that stops broadcasting
 * takes its window with it.
 */
export async function startStreamSession(opts: {
  room: string;
  device: DeviceEntry;
  viewerId: string;
  wantAudio: boolean;
}): Promise<void> {
  teardown();
  answered = false;
  state = {
    ...IDLE,
    active: true,
    deviceId: opts.device.id,
    deviceName: opts.device.name,
    wantAudio: opts.wantAudio,
    status: "connecting",
  };
  emit();

  try {
    const receiver = await createReceiver({
      wantAudio: opts.wantAudio,
      onStream: (s) => {
        if (state.active) setState({ stream: s });
      },
      onStatus: (s) => {
        if (!state.active) return;
        if (s === "live") setState({ status: "live" });
        else if (s === "failed") endStreamSession();
      },
    });
    // The session may have been ended while awaiting the offer.
    if (!state.active) {
      receiver.close();
      return;
    }
    handle = receiver;
    const activeCall = requestStream(
      opts.room,
      opts.device.id,
      opts.viewerId,
      receiver.invite,
    );
    call = activeCall;
    activeCall.onAnswer((answerSdp) => {
      if (answered) return;
      answered = true;
      void receiver
        .accept(answerSdp)
        .then(() => activeCall.close()) // drop the SDP the middleman held
        .catch(() => endStreamSession());
    });
  } catch {
    endStreamSession();
  }
}
