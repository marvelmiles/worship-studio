import {
  child,
  onDisconnect,
  onValue,
  ref,
  remove,
  serverTimestamp,
  set,
  type Database,
  type DatabaseReference,
} from "firebase/database";
import { getSignalingDb } from "../../../lib/signalingDb";

/* Its own corner of each room, so a device offering to share a library never
   shows up in the list of cameras, and the rules that already cover the
   signalling subtree cover this too. */
const ROOT_PATH = "signal";
const SHARE_PATH = "share";

const STALE_PRESENCE_MS = 2 * 60 * 1000;
const PRESENCE_HEARTBEAT_MS = 30 * 1000;
const FALLBACK_DEVICE_NAME = "Device";

const roomPath = (room: string): string => `${ROOT_PATH}/${room}/${SHARE_PATH}`;

export interface ShareDevice {
  id: string;
  name: string;
  /** When it last said it was here, so a reloaded device replaces its old row. */
  lastSeen: number;
  /** Reached over a link set up with a code rather than found on the network. */
  isPaired?: boolean;
}

export interface IncomingCall {
  callerId: string;
  callerName: string;
  offerSdp: string;
}

const devicesRef = (database: Database, room: string): DatabaseReference =>
  ref(database, `${roomPath(room)}/devices`);

const deviceRef = (
  database: Database,
  room: string,
  deviceId: string,
): DatabaseReference => ref(database, `${roomPath(room)}/devices/${deviceId}`);

const inboxRef = (
  database: Database,
  room: string,
  deviceId: string,
): DatabaseReference => ref(database, `${roomPath(room)}/calls/${deviceId}`);

/* One slot per caller rather than one per device, so several devices can be
   handed the same library at once without overwriting each other. */
const callRef = (
  database: Database,
  room: string,
  targetId: string,
  callerId: string,
): DatabaseReference =>
  ref(database, `${roomPath(room)}/calls/${targetId}/${callerId}`);

const requireDatabase = (): Database => {
  const database = getSignalingDb();
  if (!database) throw new Error("Signalling is not configured.");
  return database;
};

export interface SharePresence {
  close: () => Promise<void>;
}

/** Announces this device to the others on the same network. */
export const publishShareDevice = (
  room: string,
  deviceId: string,
  name: string,
): SharePresence => {
  const database = requireDatabase();
  const presence = deviceRef(database, room, deviceId);
  const inbox = inboxRef(database, room, deviceId);

  const announce = () => {
    void onDisconnect(presence).remove();
    void onDisconnect(inbox).remove();
    void set(presence, { name, ts: serverTimestamp() });
  };

  // onDisconnect fires once per socket, so presence is re-announced whenever a sleeping device reconnects.
  const stopConnectionListener = onValue(
    ref(database, ".info/connected"),
    (snapshot) => {
      if (snapshot.val() === true) announce();
    },
  );
  const heartbeat = window.setInterval(
    () => void set(child(presence, "ts"), serverTimestamp()).catch(() => {}),
    PRESENCE_HEARTBEAT_MS,
  );

  return {
    close: async () => {
      window.clearInterval(heartbeat);
      stopConnectionListener();
      void onDisconnect(presence).cancel();
      void onDisconnect(inbox).cancel();
      await Promise.all([remove(presence), remove(inbox)]).catch(() => {});
    },
  };
};

export const watchShareDevices = (
  room: string,
  onDevices: (devices: ShareDevice[]) => void,
): (() => void) => {
  const database = getSignalingDb();
  if (!database) return () => {};
  return onValue(devicesRef(database, room), (snapshot) => {
    const now = Date.now();
    const devices: ShareDevice[] = [];
    snapshot.forEach((entry) => {
      const value = entry.val() as { name?: string; ts?: number } | null;
      const isStale =
        typeof value?.ts === "number" && now - value.ts > STALE_PRESENCE_MS;
      if (isStale || !entry.key) return;
      devices.push({
        id: entry.key,
        name: value?.name || FALLBACK_DEVICE_NAME,
        lastSeen: typeof value?.ts === "number" ? value.ts : 0,
      });
    });
    onDevices(devices);
  });
};

export interface ShareCall {
  onAnswer: (handler: (answerSdp: string) => void) => void;
  close: () => Promise<void>;
}

/** Puts an offer in another device's inbox and waits for its reply. */
export const callShareDevice = (
  room: string,
  targetId: string,
  callerId: string,
  callerName: string,
  offerSdp: string,
): ShareCall => {
  const database = requireDatabase();
  const call = callRef(database, room, targetId, callerId);
  let stopAnswerListener: (() => void) | null = null;

  void onDisconnect(call).remove();
  void set(call, {
    offer: offerSdp,
    name: callerName,
    ts: serverTimestamp(),
  });

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

/** Every offer waiting in this device's inbox, as it arrives. */
export const watchIncomingCalls = (
  room: string,
  deviceId: string,
  onCall: (call: IncomingCall) => void,
): (() => void) => {
  const database = getSignalingDb();
  if (!database) return () => {};
  return onValue(inboxRef(database, room, deviceId), (snapshot) => {
    snapshot.forEach((entry) => {
      const value = entry.val() as {
        offer?: string;
        name?: string;
        answer?: string;
      } | null;
      if (!entry.key || !value?.offer || value.answer) return;
      onCall({
        callerId: entry.key,
        callerName: value.name || FALLBACK_DEVICE_NAME,
        offerSdp: value.offer,
      });
    });
  });
};

export const answerShareCall = async (
  room: string,
  deviceId: string,
  callerId: string,
  answerSdp: string,
): Promise<void> => {
  const database = requireDatabase();
  await set(
    child(callRef(database, room, deviceId, callerId), "answer"),
    answerSdp,
  );
};

export const clearShareCall = async (
  room: string,
  deviceId: string,
  callerId: string,
): Promise<void> => {
  const database = getSignalingDb();
  if (!database) return;
  await remove(callRef(database, room, deviceId, callerId)).catch(() => {});
};
