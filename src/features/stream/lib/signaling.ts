import {
  child,
  ref,
  set,
  remove,
  onValue,
  onDisconnect,
  serverTimestamp,
  type Database,
  type DatabaseReference,
} from "firebase/database";
import { getSignalingDb } from "./firebase";

const ROOT_PATH = "signal";
const STALE_PRESENCE_MS = 5 * 60 * 1000;
const PRESENCE_HEARTBEAT_MS = 60 * 1000;
const FALLBACK_DEVICE_NAME = "Phone camera";

export interface DeviceEntry {
  id: string;
  name: string;
}

const devicesRef = (database: Database, room: string): DatabaseReference =>
  ref(database, `${ROOT_PATH}/${room}/devices`);

const deviceRef = (
  database: Database,
  room: string,
  deviceId: string,
): DatabaseReference =>
  ref(database, `${ROOT_PATH}/${room}/devices/${deviceId}`);

const callRef = (
  database: Database,
  room: string,
  deviceId: string,
): DatabaseReference => ref(database, `${ROOT_PATH}/${room}/calls/${deviceId}`);

const requireDatabase = (): Database => {
  const database = getSignalingDb();
  if (!database) throw new Error("Signalling is not configured.");
  return database;
};

export interface BroadcastHandle {
  deviceId: string;
  onOffer: (handler: (offerSdp: string) => void) => void;
  sendAnswer: (answerSdp: string) => Promise<void>;
  clearCall: () => Promise<void>;
  close: () => Promise<void>;
}

// Firebase only relays the SDP handshake; both sides delete it once the peer link is up.
export const publishBroadcaster = (
  room: string,
  name: string,
): BroadcastHandle => {
  const database = requireDatabase();
  const deviceId = crypto.randomUUID();
  const presence = deviceRef(database, room, deviceId);
  const call = callRef(database, room, deviceId);
  let stopOfferListener: (() => void) | null = null;

  const announcePresence = () => {
    void onDisconnect(presence).remove();
    void onDisconnect(call).remove();
    void set(presence, { name, ts: serverTimestamp() });
  };

  // onDisconnect fires once per socket, so presence is re-announced whenever a sleeping device reconnects.
  const stopConnectionListener = onValue(
    ref(database, ".info/connected"),
    (snapshot) => {
      if (snapshot.val() === true) announcePresence();
    },
  );
  const heartbeat = window.setInterval(
    () => void set(child(presence, "ts"), serverTimestamp()).catch(() => {}),
    PRESENCE_HEARTBEAT_MS,
  );

  return {
    deviceId,
    onOffer: (handler) => {
      stopOfferListener = onValue(child(call, "offer"), (snapshot) => {
        const offer: unknown = snapshot.val();
        if (typeof offer === "string" && offer) handler(offer);
      });
    },
    sendAnswer: async (answerSdp) => {
      await set(child(call, "answer"), answerSdp);
    },
    clearCall: async () => {
      await remove(call);
    },
    close: async () => {
      window.clearInterval(heartbeat);
      stopConnectionListener();
      stopOfferListener?.();
      void onDisconnect(presence).cancel();
      void onDisconnect(call).cancel();
      await Promise.all([remove(presence), remove(call)]).catch(() => {});
    },
  };
};

export const watchBroadcasters = (
  room: string,
  onDevices: (devices: DeviceEntry[]) => void,
): (() => void) => {
  const database = getSignalingDb();
  if (!database) return () => {};
  return onValue(devicesRef(database, room), (snapshot) => {
    const now = Date.now();
    const devices: DeviceEntry[] = [];
    snapshot.forEach((child) => {
      const value = child.val() as { name?: string; ts?: number } | null;
      if (
        value &&
        typeof value.ts === "number" &&
        now - value.ts > STALE_PRESENCE_MS
      ) {
        return;
      }
      devices.push({
        id: child.key ?? "",
        name: value?.name || FALLBACK_DEVICE_NAME,
      });
    });
    onDevices(devices.filter((device) => device.id));
  });
};

export interface CallHandle {
  onAnswer: (handler: (answerSdp: string) => void) => void;
  close: () => Promise<void>;
}

export const requestStream = (
  room: string,
  deviceId: string,
  viewerId: string,
  offerSdp: string,
): CallHandle => {
  const database = requireDatabase();
  const call = callRef(database, room, deviceId);
  let stopAnswerListener: (() => void) | null = null;

  void onDisconnect(call).remove();
  void set(call, { offer: offerSdp, viewerId, ts: serverTimestamp() });

  return {
    onAnswer: (handler) => {
      stopAnswerListener = onValue(child(call, "answer"), (snapshot) => {
        const answer: unknown = snapshot.val();
        if (typeof answer === "string" && answer) handler(answer);
      });
    },
    close: async () => {
      stopAnswerListener?.();
      void onDisconnect(call).cancel();
      await remove(call).catch(() => {});
    },
  };
};
