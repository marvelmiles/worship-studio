import {
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

/**
 * The signalling middleman. It exists only to hand one WebRTC description from
 * a phone to a laptop; the moment the peer link is up, everything written here
 * is deleted. Three things keep the database empty and cheap:
 *
 *  - The bulky part (the SDP offer/answer) lives under `calls/` and is removed
 *    by both sides as soon as the connection reaches "connected".
 *  - `onDisconnect().remove()` guarantees a device's nodes vanish if it closes
 *    or crashes, so nothing is ever orphaned.
 *  - A broadcaster leaves behind only a tiny presence row (name + timestamp)
 *    while it waits, and that too is removed on disconnect.
 *
 * Paths:
 *   signal/{room}/devices/{deviceId}  -> { name, ts }        (presence)
 *   signal/{room}/calls/{deviceId}    -> { offer, answer, viewerId, ts }
 */

const ROOT = "signal";
/** Presence rows older than this (server ms) are treated as stale strays. */
const STALE_MS = 2 * 60 * 1000;

export interface DeviceEntry {
  id: string;
  name: string;
}

function devicesRef(db: Database, room: string): DatabaseReference {
  return ref(db, `${ROOT}/${room}/devices`);
}
function deviceRef(db: Database, room: string, id: string): DatabaseReference {
  return ref(db, `${ROOT}/${room}/devices/${id}`);
}
function callRef(db: Database, room: string, id: string): DatabaseReference {
  return ref(db, `${ROOT}/${room}/calls/${id}`);
}

/* ------------------------------ Broadcaster (phone) ----------------------- */

export interface BroadcastHandle {
  deviceId: string;
  /** Fires with the viewer's offer SDP when a laptop chooses this device. */
  onOffer: (handler: (offerSdp: string) => void) => void;
  /** Publish this device's answer SDP back to the waiting viewer. */
  sendAnswer: (answerSdp: string) => Promise<void>;
  /** Drop the heavy SDP payload once connected, keeping only presence. */
  clearCall: () => Promise<void>;
  /** Remove every trace of this device from signalling. */
  close: () => Promise<void>;
}

/**
 * Announces this device as available in the room and waits to be picked. Throws
 * if signalling isn't configured — callers gate on `signalingConfigured` first.
 */
export function publishBroadcaster(room: string, name: string): BroadcastHandle {
  const db = getSignalingDb();
  if (!db) throw new Error("Signalling is not configured.");
  const deviceId = crypto.randomUUID();
  const dRef = deviceRef(db, room, deviceId);
  const cRef = callRef(db, room, deviceId);

  // Presence, self-cleaning on disconnect.
  void onDisconnect(dRef).remove();
  void onDisconnect(cRef).remove();
  void set(dRef, { name, ts: serverTimestamp() });

  let stopOffer: (() => void) | null = null;

  return {
    deviceId,
    onOffer: (handler) => {
      const offerRef = ref(db, `${ROOT}/${room}/calls/${deviceId}/offer`);
      stopOffer = onValue(offerRef, (snap) => {
        const offer = snap.val();
        if (typeof offer === "string" && offer) handler(offer);
      });
    },
    sendAnswer: async (answerSdp) => {
      await set(ref(db, `${ROOT}/${room}/calls/${deviceId}/answer`), answerSdp);
    },
    clearCall: async () => {
      await remove(cRef);
    },
    close: async () => {
      stopOffer?.();
      void onDisconnect(dRef).cancel();
      void onDisconnect(cRef).cancel();
      await Promise.all([remove(dRef), remove(cRef)]).catch(() => {});
    },
  };
}

/* -------------------------------- Viewer (laptop) ------------------------- */

/** Subscribes to the live list of broadcasting devices in the room. */
export function watchBroadcasters(room: string, cb: (devices: DeviceEntry[]) => void): () => void {
  const db = getSignalingDb();
  if (!db) return () => {};
  return onValue(devicesRef(db, room), (snap) => {
    const now = Date.now();
    const list: DeviceEntry[] = [];
    snap.forEach((child) => {
      const v = child.val() as { name?: string; ts?: number } | null;
      // Skip strays a crashed device left before onDisconnect could fire.
      if (v && typeof v.ts === "number" && now - v.ts > STALE_MS) return;
      list.push({ id: child.key as string, name: v?.name || "Phone camera" });
    });
    cb(list);
  });
}

export interface CallHandle {
  /** Fires with the broadcaster's answer SDP. */
  onAnswer: (handler: (answerSdp: string) => void) => void;
  /** Remove the call node (heavy SDP) — call once connected and on teardown. */
  close: () => Promise<void>;
}

/**
 * Sends the viewer's offer to a chosen broadcaster and waits for its answer.
 */
export function requestStream(
  room: string,
  deviceId: string,
  viewerId: string,
  offerSdp: string
): CallHandle {
  const db = getSignalingDb();
  if (!db) throw new Error("Signalling is not configured.");
  const cRef = callRef(db, room, deviceId);

  void onDisconnect(cRef).remove();
  void set(cRef, { offer: offerSdp, viewerId, ts: serverTimestamp() });

  let stopAnswer: (() => void) | null = null;

  return {
    onAnswer: (handler) => {
      const answerRef = ref(db, `${ROOT}/${room}/calls/${deviceId}/answer`);
      stopAnswer = onValue(answerRef, (snap) => {
        const answer = snap.val();
        if (typeof answer === "string" && answer) handler(answer);
      });
    },
    close: async () => {
      stopAnswer?.();
      void onDisconnect(cRef).cancel();
      await remove(cRef).catch(() => {});
    },
  };
}
