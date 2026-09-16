import { useSyncExternalStore } from "react";
import type { PipPlacement } from "../../../types";
import { useStore } from "../../../store/useStore";
import {
  DEFAULT_PIP_PLACEMENT,
  normalisePipPlacement,
  PIP_CORNERS,
} from "../../../lib/pipPlacement";
import { createReceiver, type ReceiverHandle } from "./receiverPeer";
import type { PeerStatus } from "./peerStatus";
import { requestStream, type CallHandle, type DeviceEntry } from "./signaling";
import {
  setLiveComposition,
  streamLiveWindow,
  type LiveStreamWindow,
} from "./streamLive";
import { clearStreamOverlays } from "./streamOverlayStore";

export type StreamMode = "stage" | "pip";

export const MAX_STREAM_CAMERAS = 3;
export const MAX_STREAM_SECONDARIES = MAX_STREAM_CAMERAS - 1;

const RECONNECT_RETRY_MS = 8000;
const RECONNECT_WINDOW_MS = 3 * 60 * 1000;

export interface StreamCamera {
  deviceId: string;
  deviceName: string;
  status: PeerStatus;
  stream: MediaStream | null;
  audioShared: boolean;
  placement: PipPlacement;
  muted: boolean;
}

export interface StreamSessionState {
  active: boolean;
  cameras: StreamCamera[];
  primaryId: string | null;
  secondaryIds: string[];
  mode: StreamMode;
}

const IDLE_SESSION: StreamSessionState = {
  active: false,
  cameras: [],
  primaryId: null,
  secondaryIds: [],
  mode: "stage",
};

interface SignalRoute {
  room: string;
  viewerId: string;
}

interface Peer {
  handle: ReceiverHandle;
  call: CallHandle | null;
  signalRoute: SignalRoute | null;
  reconnectTimer: number | null;
  reconnectStartedAt: number;
}

let sessionState: StreamSessionState = IDLE_SESSION;
const peers = new Map<string, Peer>();
const listeners = new Set<() => void>();
let isViewerLive = false;

export const subscribeStreamSession = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getStreamSessionState = (): StreamSessionState => sessionState;

export const useStreamSession = (): StreamSessionState =>
  useSyncExternalStore(subscribeStreamSession, getStreamSessionState);

export const findCamera = (
  session: StreamSessionState,
  deviceId: string | null,
): StreamCamera | null =>
  session.cameras.find((camera) => camera.deviceId === deviceId) ?? null;

export const primaryCamera = (
  session: StreamSessionState,
): StreamCamera | null => findCamera(session, session.primaryId);

export const secondaryCameras = (session: StreamSessionState): StreamCamera[] =>
  session.secondaryIds.flatMap((id) => {
    const camera = findCamera(session, id);
    return camera ? [camera] : [];
  });

export const benchedCameras = (session: StreamSessionState): StreamCamera[] =>
  session.cameras.filter(
    (camera) =>
      camera.deviceId !== session.primaryId &&
      !session.secondaryIds.includes(camera.deviceId),
  );

export const canJoinCamera = (session: StreamSessionState): boolean =>
  session.cameras.length < MAX_STREAM_CAMERAS;

const notifyListeners = () => {
  for (const listener of listeners) listener();
};

const publishComposition = (): void => {
  if (!sessionState.active) {
    setLiveComposition(null);
    return;
  }
  const secondaries: LiveStreamWindow[] = secondaryCameras(sessionState).map(
    (camera) => ({
      id: camera.deviceId,
      label: camera.deviceName,
      stream: camera.stream,
      placement: camera.placement,
      muted: camera.muted,
    }),
  );
  setLiveComposition({
    primary: primaryCamera(sessionState)?.stream ?? null,
    secondaries,
  });
};

// The composition is republished before listeners wake, so popups never read controls ahead of the picture.
const commit = (next: StreamSessionState): void => {
  sessionState = next;
  publishComposition();
  notifyListeners();
};

const patchCamera = (deviceId: string, patch: Partial<StreamCamera>): void => {
  let hasChanged = false;
  const cameras = sessionState.cameras.map((camera) => {
    if (camera.deviceId !== deviceId) return camera;
    hasChanged = true;
    return { ...camera, ...patch };
  });
  if (hasChanged) commit({ ...sessionState, cameras });
};

export const setStreamMode = (mode: StreamMode): void => {
  if (sessionState.active) commit({ ...sessionState, mode });
};

export const setSessionViewerLive = (live: boolean): void => {
  isViewerLive = live;
  for (const peer of peers.values()) peer.handle.setViewerLive(live);
};

export const setPrimaryCamera = (deviceId: string): void => {
  if (!findCamera(sessionState, deviceId)) return;
  if (sessionState.primaryId === deviceId) return;
  const outgoingId = sessionState.primaryId;
  const slot = sessionState.secondaryIds.indexOf(deviceId);
  const secondaryIds =
    slot >= 0 && outgoingId
      ? sessionState.secondaryIds.map((id, index) =>
          index === slot ? outgoingId : id,
        )
      : sessionState.secondaryIds.filter((id) => id !== deviceId);
  commit({ ...sessionState, primaryId: deviceId, secondaryIds });
};

const freeCorner = (): PipPlacement => {
  const takenCorners = new Set(
    secondaryCameras(sessionState).map((camera) => camera.placement.corner),
  );
  const corner = PIP_CORNERS.find((candidate) => !takenCorners.has(candidate));
  return { ...DEFAULT_PIP_PLACEMENT, ...(corner ? { corner } : {}) };
};

export const showCameraAsSecondary = (deviceId: string): boolean => {
  const camera = findCamera(sessionState, deviceId);
  if (!camera || deviceId === sessionState.primaryId) return false;
  if (sessionState.secondaryIds.includes(deviceId)) return true;
  if (sessionState.secondaryIds.length >= MAX_STREAM_SECONDARIES) return false;
  const placement = freeCorner();
  commit({
    ...sessionState,
    cameras: sessionState.cameras.map((entry) =>
      entry.deviceId === deviceId ? { ...entry, placement } : entry,
    ),
    secondaryIds: [...sessionState.secondaryIds, deviceId],
  });
  return true;
};

export const hideCameraSecondary = (deviceId: string): void => {
  if (!sessionState.secondaryIds.includes(deviceId)) return;
  commit({
    ...sessionState,
    secondaryIds: sessionState.secondaryIds.filter((id) => id !== deviceId),
  });
};

export const setCameraPlacement = (
  deviceId: string,
  patch: Partial<PipPlacement>,
): void => {
  const camera = findCamera(sessionState, deviceId);
  if (!camera) return;
  patchCamera(deviceId, {
    placement: normalisePipPlacement({ ...camera.placement, ...patch }),
  });
};

export const setCameraMuted = (deviceId: string, muted: boolean): void => {
  patchCamera(deviceId, { muted });
};

const stopReconnecting = (peer: Peer): void => {
  if (peer.reconnectTimer !== null) window.clearTimeout(peer.reconnectTimer);
  peer.reconnectTimer = null;
};

const closePeer = (deviceId: string): void => {
  const peer = peers.get(deviceId);
  if (!peer) return;
  peers.delete(deviceId);
  stopReconnecting(peer);
  void peer.call?.close().catch(() => {});
  peer.handle.close();
};

const sendOffer = (
  peer: Peer,
  deviceId: string,
  offerSdp: string,
  onAcceptFailed?: () => void,
): void => {
  if (!peer.signalRoute) return;
  void peer.call?.close();
  const call = requestStream(
    peer.signalRoute.room,
    deviceId,
    peer.signalRoute.viewerId,
    offerSdp,
  );
  peer.call = call;
  let isAnswered = false;
  call.onAnswer((answerSdp) => {
    if (isAnswered || peer.call !== call) return;
    isAnswered = true;
    void peer.handle
      .accept(answerSdp)
      .then(() => call.close())
      .catch(() => onAcceptFailed?.());
  });
};

// A failed link is restarted over signalling (ICE restart), retrying until the sleeping device wakes or the window closes.
const reconnectCamera = (deviceId: string): void => {
  const peer = peers.get(deviceId);
  if (!peer?.signalRoute || peer.reconnectTimer !== null) return;
  peer.reconnectStartedAt = Date.now();

  const attemptRestart = async () => {
    if (peers.get(deviceId) !== peer) return;
    if (Date.now() - peer.reconnectStartedAt > RECONNECT_WINDOW_MS) {
      peer.reconnectTimer = null;
      patchCamera(deviceId, { status: "failed" });
      const camera = findCamera(sessionState, deviceId);
      useStore
        .getState()
        .pushToast(
          `${camera?.deviceName ?? "A camera"} stopped sharing.`,
          "error",
        );
      return;
    }
    try {
      sendOffer(peer, deviceId, await peer.handle.createRestartOffer());
    } catch {
      peer.reconnectTimer = window.setTimeout(
        attemptRestart,
        RECONNECT_RETRY_MS,
      );
      return;
    }
    if (peers.get(deviceId) === peer) {
      peer.reconnectTimer = window.setTimeout(
        attemptRestart,
        RECONNECT_RETRY_MS,
      );
    }
  };

  peer.reconnectTimer = window.setTimeout(attemptRestart, 0);
};

const handlePeerStatus = (deviceId: string, status: PeerStatus): void => {
  const peer = peers.get(deviceId);
  if (status === "live" && peer) {
    stopReconnecting(peer);
    void peer.call?.close();
    peer.call = null;
  }
  if (status === "failed" && peer?.signalRoute) {
    patchCamera(deviceId, { status: "reconnecting" });
    reconnectCamera(deviceId);
    return;
  }
  patchCamera(deviceId, { status });
};

const teardown = (): void => {
  for (const deviceId of [...peers.keys()]) closePeer(deviceId);
  if (streamLiveWindow.getState().isLive) streamLiveWindow.endLive();
  setLiveComposition(null);
  clearStreamOverlays();
  isViewerLive = false;
};

export const endStreamSession = (): void => {
  if (!sessionState.active && peers.size === 0) return;
  teardown();
  sessionState = IDLE_SESSION;
  notifyListeners();
};

export const disconnectStreamCamera = (deviceId: string): void => {
  if (!findCamera(sessionState, deviceId)) return;
  closePeer(deviceId);
  const cameras = sessionState.cameras.filter(
    (camera) => camera.deviceId !== deviceId,
  );
  if (cameras.length === 0) {
    endStreamSession();
    return;
  }
  const secondaryIds = sessionState.secondaryIds.filter(
    (id) => id !== deviceId,
  );
  const primaryId =
    sessionState.primaryId === deviceId
      ? (secondaryIds.shift() ?? cameras[0].deviceId)
      : sessionState.primaryId;
  commit({ ...sessionState, cameras, primaryId, secondaryIds });
};

const joinCamera = (
  camera: Omit<StreamCamera, "placement" | "muted">,
): void => {
  commit({
    ...sessionState,
    active: true,
    cameras: [
      ...sessionState.cameras,
      {
        ...camera,
        placement: sessionState.active ? freeCorner() : DEFAULT_PIP_PLACEMENT,
        muted: true,
      },
    ],
    primaryId: sessionState.primaryId ?? camera.deviceId,
    mode: sessionState.active ? sessionState.mode : "stage",
  });
};

const canAdmit = (deviceId: string): boolean =>
  !findCamera(sessionState, deviceId) &&
  (!sessionState.active || canJoinCamera(sessionState));

// Code-paired cameras handshake outside the session, then hand their connection over so every app-root surface sees them.
export const adoptStreamCamera = (camera: {
  deviceId: string;
  deviceName: string;
  handle: ReceiverHandle;
  stream: MediaStream | null;
  status: PeerStatus;
  audioShared?: boolean;
}): boolean => {
  if (!canAdmit(camera.deviceId)) return false;
  peers.set(camera.deviceId, {
    handle: camera.handle,
    call: null,
    signalRoute: null,
    reconnectTimer: null,
    reconnectStartedAt: 0,
  });
  camera.handle.setViewerLive(isViewerLive);
  joinCamera({
    deviceId: camera.deviceId,
    deviceName: camera.deviceName,
    status: camera.status,
    stream: camera.stream,
    audioShared: camera.audioShared ?? false,
  });
  return true;
};

export const updateStreamCamera = (
  deviceId: string,
  patch: Partial<
    Pick<StreamCamera, "stream" | "status" | "audioShared" | "deviceName">
  >,
): void => {
  patchCamera(deviceId, patch);
};

export const connectStreamCamera = async (options: {
  room: string;
  device: DeviceEntry;
  viewerId: string;
}): Promise<boolean> => {
  const { device } = options;
  if (!canAdmit(device.id)) return false;

  joinCamera({
    deviceId: device.id,
    deviceName: device.name,
    status: "connecting",
    stream: null,
    audioShared: false,
  });

  const isStillJoined = () =>
    sessionState.active && Boolean(findCamera(sessionState, device.id));

  try {
    const receiver = await createReceiver({
      onStream: (stream) => {
        if (isStillJoined()) patchCamera(device.id, { stream });
      },
      onAudioShared: (audioShared) => {
        if (isStillJoined()) patchCamera(device.id, { audioShared });
      },
      onStatus: (status) => {
        if (isStillJoined()) handlePeerStatus(device.id, status);
      },
    });

    if (!isStillJoined()) {
      receiver.close();
      return false;
    }

    receiver.setViewerLive(isViewerLive);
    const peer: Peer = {
      handle: receiver,
      call: null,
      signalRoute: { room: options.room, viewerId: options.viewerId },
      reconnectTimer: null,
      reconnectStartedAt: 0,
    };
    peers.set(device.id, peer);
    sendOffer(peer, device.id, receiver.invite, () =>
      disconnectStreamCamera(device.id),
    );
    return true;
  } catch {
    disconnectStreamCamera(device.id);
    return false;
  }
};
