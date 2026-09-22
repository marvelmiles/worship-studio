import { useSyncExternalStore } from "react";
import type { PairedLink } from "./sharePairing";
import type { ShareConnector } from "./shareSession";
import type { ShareDevice } from "./shareSignaling";

interface PairedEntry {
  device: ShareDevice;
  paired: PairedLink;
}

/* Held for the whole app rather than one screen, so a device paired on the
   Quick Share page can still be sent a single item from any library. */
const entries = new Map<string, PairedEntry>();
const listeners = new Set<() => void>();
let snapshot: ShareDevice[] = [];

const publish = () => {
  snapshot = [...entries.values()].map((entry) => entry.device);
  for (const listener of listeners) listener();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const forgetPairedDevice = (deviceId: string): void => {
  const entry = entries.get(deviceId);
  if (!entry) return;
  entries.delete(deviceId);
  entry.paired.link.close();
  publish();
};

/** Lists a freshly paired device, and drops it again once its link goes. */
export const addPairedDevice = (paired: PairedLink): ShareDevice => {
  const device: ShareDevice = {
    id: `paired-${crypto.randomUUID()}`,
    name: paired.peerName,
    lastSeen: Date.now(),
    isPaired: true,
  };
  entries.set(device.id, { device, paired });

  const forget = () => forgetPairedDevice(device.id);
  const { connection } = paired.link;
  paired.channel.addEventListener("close", forget);
  connection.addEventListener("connectionstatechange", () => {
    if (
      connection.connectionState === "failed" ||
      connection.connectionState === "closed"
    ) {
      forget();
    }
  });

  publish();
  return device;
};

/** Reaches a paired device over its open link, which outlasts each send. */
export const pairedDeviceConnector = (
  deviceId: string,
): ShareConnector | null => {
  const entry = entries.get(deviceId);
  if (!entry) return null;
  return async () => {
    const { channel } = entry.paired;
    if (channel.readyState !== "open") {
      forgetPairedDevice(deviceId);
      throw new Error(
        `${entry.device.name} is no longer connected. Pair it again.`,
      );
    }
    return { channel, release: async () => {} };
  };
};

export const usePairedDevices = (): ShareDevice[] =>
  useSyncExternalStore(subscribe, () => snapshot);
