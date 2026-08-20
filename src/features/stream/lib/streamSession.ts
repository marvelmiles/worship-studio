import { useSyncExternalStore } from "react";
import type { PipPlacement } from "../../../types";
import { useStore } from "../../../store/useStore";
import {
  DEFAULT_PIP_PLACEMENT,
  normalisePipPlacement,
  PIP_CORNERS,
} from "../../../lib/pipPlacement";
import { createReceiver, type PeerStatus, type ReceiverHandle } from "./peer";
import { requestStream, type CallHandle, type DeviceEntry } from "./signaling";
import {
  setLiveComposition,
  streamLiveWindow,
  type LiveStreamWindow,
} from "./streamLive";
import { clearStreamOverlays } from "./streamOverlayStore";

/**
 * Owns the laptop's live camera connections for the whole app, the way
 * liveWindow.ts owns the projection popup. Keeping the peer connections and
 * their MediaStreams in a module singleton (not a route component) is what lets
 * the projection survive navigation: the operator can pop the video out and move
 * around the app, and the cameras keep running because nothing here unmounts.
 *
 * Up to three devices can be joined at once. One of them is the primary, filling
 * the screen; any of the others can be drawn as a corner window over it, or held
 * connected and off screen so the operator can cut to it instantly. Which camera
 * is which is a decision they change at any time, and changing it moves no
 * media: every joined camera is already flowing, so a switch is only a question
 * of where its picture is drawn.
 *
 * "stage" shows the full-screen projection overlay; "pip" shrinks it into the
 * floating, draggable window. Both are rendered once at the app root from this
 * state (see StreamProjectionRoot).
 */

export type StreamMode = "stage" | "pip";

/** How many devices may be joined to one session. */
export const MAX_STREAM_CAMERAS = 3;

/** How many of them may be drawn as corner windows over the primary. */
export const MAX_STREAM_SECONDARIES = MAX_STREAM_CAMERAS - 1;

export interface StreamCamera {
  deviceId: string;
  deviceName: string;
  status: PeerStatus;
  stream: MediaStream | null;
  /** Whether this sender is currently sharing its microphone. */
  audioShared: boolean;
  /** Where its picture sits while it is a corner window. */
  placement: PipPlacement;
  /**
   * Silenced locally. Corner windows start silent: three rooms of sound at once
   * is never what a second camera was joined for.
   */
  muted: boolean;
}

export interface StreamSessionState {
  active: boolean;
  cameras: StreamCamera[];
  /** Device id of the camera filling the screen. */
  primaryId: string | null;
  /** Device ids drawn as corner windows, in paint order. */
  secondaryIds: string[];
  mode: StreamMode;
}

const IDLE: StreamSessionState = {
  active: false,
  cameras: [],
  primaryId: null,
  secondaryIds: [],
  mode: "stage",
};

interface Peer {
  handle: ReceiverHandle;
  call: CallHandle | null;
  answered: boolean;
}

let state: StreamSessionState = IDLE;
const peers = new Map<string, Peer>();
const listeners = new Set<() => void>();
let viewerLive = false;

/* --------------------------------- Reading -------------------------------- */

export function subscribeStreamSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getStreamSessionState(): StreamSessionState {
  return state;
}

/** React binding, stable snapshot identity: it changes only when state does. */
export function useStreamSession(): StreamSessionState {
  return useSyncExternalStore(subscribeStreamSession, getStreamSessionState);
}

export const findCamera = (
  session: StreamSessionState,
  deviceId: string | null,
): StreamCamera | null =>
  session.cameras.find((camera) => camera.deviceId === deviceId) ?? null;

export const primaryCamera = (
  session: StreamSessionState,
): StreamCamera | null => findCamera(session, session.primaryId);

/** The corner windows, in the order they are drawn. */
export const secondaryCameras = (session: StreamSessionState): StreamCamera[] =>
  session.secondaryIds.flatMap((id) => {
    const camera = findCamera(session, id);
    return camera ? [camera] : [];
  });

/** Joined cameras that are not on screen, ready to be cut to. */
export const benchedCameras = (session: StreamSessionState): StreamCamera[] =>
  session.cameras.filter(
    (camera) =>
      camera.deviceId !== session.primaryId &&
      !session.secondaryIds.includes(camera.deviceId),
  );

export const canJoinCamera = (session: StreamSessionState): boolean =>
  session.cameras.length < MAX_STREAM_CAMERAS;

/* --------------------------------- Writing -------------------------------- */

function publishComposition(): void {
  if (!state.active) {
    setLiveComposition(null);
    return;
  }
  const secondaries: LiveStreamWindow[] = secondaryCameras(state).map(
    (camera) => ({
      id: camera.deviceId,
      label: camera.deviceName,
      stream: camera.stream,
      placement: camera.placement,
      muted: camera.muted,
    }),
  );
  setLiveComposition({
    primary: primaryCamera(state)?.stream ?? null,
    secondaries,
  });
}

/**
 * Republishes what the projection popups read, then wakes every subscriber.
 * Both happen on the one commit, so a popup that polls between them can never
 * find a composition disagreeing with the controls driving it.
 */
function commit(next: StreamSessionState): void {
  state = next;
  publishComposition();
  for (const listener of listeners) listener();
}

function patchCamera(deviceId: string, patch: Partial<StreamCamera>): void {
  let changed = false;
  const cameras = state.cameras.map((camera) => {
    if (camera.deviceId !== deviceId) return camera;
    changed = true;
    return { ...camera, ...patch };
  });
  if (changed) commit({ ...state, cameras });
}

export function setStreamMode(mode: StreamMode): void {
  if (state.active) commit({ ...state, mode });
}

/** Tells every connected sender whether this device has a feed on a display. */
export function setSessionViewerLive(live: boolean): void {
  viewerLive = live;
  for (const peer of peers.values()) peer.handle.setViewerLive(live);
}

/**
 * Makes a joined camera the one filling the screen.
 *
 * A camera already in a corner window swaps places with the outgoing primary,
 * which is what "switch these two" means to the operator holding the controls.
 * A camera that was off screen simply takes over, and the outgoing one goes off
 * screen with it, so the picture never gains a window nobody asked for.
 */
export function setPrimaryCamera(deviceId: string): void {
  if (!findCamera(state, deviceId) || state.primaryId === deviceId) return;
  const outgoing = state.primaryId;
  const slot = state.secondaryIds.indexOf(deviceId);
  const secondaryIds =
    slot >= 0 && outgoing
      ? state.secondaryIds.map((id, index) => (index === slot ? outgoing : id))
      : state.secondaryIds.filter((id) => id !== deviceId);
  commit({ ...state, primaryId: deviceId, secondaryIds });
}

/** The first corner not already taken, so two windows never open on top of each other. */
function freeCorner(): PipPlacement {
  const taken = new Set(
    secondaryCameras(state).map((camera) => camera.placement.corner),
  );
  const corner = PIP_CORNERS.find((candidate) => !taken.has(candidate));
  return { ...DEFAULT_PIP_PLACEMENT, ...(corner ? { corner } : {}) };
}

/** Draws a joined camera as a corner window over the primary. */
export function showCameraAsSecondary(deviceId: string): boolean {
  const camera = findCamera(state, deviceId);
  if (!camera || deviceId === state.primaryId) return false;
  if (state.secondaryIds.includes(deviceId)) return true;
  if (state.secondaryIds.length >= MAX_STREAM_SECONDARIES) return false;
  const placement = freeCorner();
  commit({
    ...state,
    cameras: state.cameras.map((entry) =>
      entry.deviceId === deviceId ? { ...entry, placement } : entry,
    ),
    secondaryIds: [...state.secondaryIds, deviceId],
  });
  return true;
}

/** Takes a corner window off the picture, leaving its device connected. */
export function hideCameraSecondary(deviceId: string): void {
  if (!state.secondaryIds.includes(deviceId)) return;
  commit({
    ...state,
    secondaryIds: state.secondaryIds.filter((id) => id !== deviceId),
  });
}

export function setCameraPlacement(
  deviceId: string,
  patch: Partial<PipPlacement>,
): void {
  const camera = findCamera(state, deviceId);
  if (!camera) return;
  patchCamera(deviceId, {
    placement: normalisePipPlacement({ ...camera.placement, ...patch }),
  });
}

export function setCameraMuted(deviceId: string, muted: boolean): void {
  patchCamera(deviceId, { muted });
}

/* -------------------------------- Lifecycle ------------------------------- */

function closePeer(deviceId: string): void {
  const peer = peers.get(deviceId);
  if (!peer) return;
  peers.delete(deviceId);
  void peer.call?.close().catch(() => {});
  peer.handle.close();
}

/**
 * Tears every connection and any projection down, without touching `state`.
 *
 * The overlays go with it. They are staged against one broadcast (this passage,
 * at this place on this camera's frame) and carrying them into the next
 * connection would put the last service's lower third back on screen the moment
 * a camera reconnects, which is exactly the accident the whole draft mechanism
 * exists to prevent.
 */
function teardown(): void {
  for (const deviceId of [...peers.keys()]) closePeer(deviceId);
  if (streamLiveWindow.getState().isLive) streamLiveWindow.endLive();
  setLiveComposition(null);
  clearStreamOverlays();
  viewerLive = false;
}

/** Ends the session: closes the projection, the PiP and every connection. */
export function endStreamSession(): void {
  if (!state.active && peers.size === 0) return;
  teardown();
  state = IDLE;
  for (const listener of listeners) listener();
}

/**
 * Disconnects one device. A corner window takes the screen if the one leaving
 * held it, and the last device out ends the session.
 */
export function disconnectStreamCamera(deviceId: string): void {
  if (!findCamera(state, deviceId)) return;
  closePeer(deviceId);
  const cameras = state.cameras.filter(
    (camera) => camera.deviceId !== deviceId,
  );
  if (cameras.length === 0) {
    endStreamSession();
    return;
  }
  const secondaryIds = state.secondaryIds.filter((id) => id !== deviceId);
  const primaryId =
    state.primaryId === deviceId
      ? (secondaryIds.shift() ?? cameras[0].deviceId)
      : state.primaryId;
  commit({ ...state, cameras, primaryId, secondaryIds });
}

/**
 * Joins another broadcasting device to the session, up to three. The first one
 * becomes the primary and opens the projection; the rest are held connected and
 * off screen until the operator gives them a place.
 *
 * A dropped connection stays in the list showing a "Disconnected" badge in real
 * time rather than being yanked away: whether to wait for it or drop it is a
 * judgement no timeout should be making during a service.
 */
export async function connectStreamCamera(opts: {
  room: string;
  device: DeviceEntry;
  viewerId: string;
}): Promise<boolean> {
  const { device } = opts;
  if (findCamera(state, device.id)) return false;
  if (state.active && !canJoinCamera(state)) return false;

  const joining: StreamCamera = {
    deviceId: device.id,
    deviceName: device.name,
    status: "connecting",
    stream: null,
    audioShared: false,
    placement: state.active ? freeCorner() : DEFAULT_PIP_PLACEMENT,
    muted: true,
  };

  commit({
    ...state,
    active: true,
    cameras: [...state.cameras, joining],
    primaryId: state.primaryId ?? device.id,
    mode: state.active ? state.mode : "stage",
  });

  /** True while the session is still holding this device's slot. */
  const stillJoined = () =>
    state.active && Boolean(findCamera(state, device.id));

  try {
    const receiver = await createReceiver({
      onStream: (stream) => {
        if (stillJoined()) patchCamera(device.id, { stream });
      },
      onAudioShared: (audioShared) => {
        if (stillJoined()) patchCamera(device.id, { audioShared });
      },
      onStatus: (status) => {
        if (!stillJoined()) return;
        patchCamera(device.id, { status });
        if (status === "failed") {
          useStore
            .getState()
            .pushToast(`${device.name} stopped sharing.`, "error");
        }
      },
    });

    // The device may have been dropped while we were awaiting the offer.
    if (!stillJoined()) {
      receiver.close();
      return false;
    }

    // Whatever the rest of the session already told the other senders holds for
    // this one too, so a camera joining a live projection is not told otherwise.
    receiver.setViewerLive(viewerLive);

    const call = requestStream(
      opts.room,
      device.id,
      opts.viewerId,
      receiver.invite,
    );
    const peer: Peer = { handle: receiver, call, answered: false };
    peers.set(device.id, peer);

    call.onAnswer((answerSdp) => {
      if (peer.answered) return;
      peer.answered = true;
      void receiver
        .accept(answerSdp)
        .then(() => call.close()) // drop the SDP the middleman held
        .catch(() => disconnectStreamCamera(device.id));
    });
    return true;
  } catch {
    disconnectStreamCamera(device.id);
    return false;
  }
}
