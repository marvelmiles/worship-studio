import { useEffect, useState } from "react";
import { detectDeviceName } from "../../../lib/deviceName";
import { deriveNetworkRoom } from "../../../lib/networkRoom";
import { signalingConfigured } from "../../../lib/signalingDb";
import {
  publishShareDevice,
  watchShareDevices,
  type ShareDevice,
  type SharePresence,
} from "./shareSignaling";

export type LobbyStatus =
  /** Working out which network this is and announcing this device. */
  | "starting"
  /** Visible to the other devices, and listening for what they send. */
  | "ready"
  /** The network could not be read, so nothing can find anything. */
  | "offline"
  /** This build has no signalling settings, so quick share cannot run. */
  | "unavailable";

export interface ShareLobbyOptions {
  /**
   * Whether to announce this device to the others. A page that is only sending
   * stays quiet: it can see who is waiting without being offered data it has
   * nowhere to show.
   */
  announce?: boolean;
}

export interface ShareLobby {
  status: LobbyStatus;
  room: string | null;
  deviceId: string;
  deviceName: string;
  /** Every other device with this page open on the same network. */
  devices: ShareDevice[];
  /** Looks again for the others, and says this device is here once more. */
  refresh: () => void;
}

export const useShareLobby = ({
  announce = true,
}: ShareLobbyOptions = {}): ShareLobby => {
  const [deviceId] = useState(() => crypto.randomUUID());
  const [status, setStatus] = useState<LobbyStatus>(
    signalingConfigured ? "starting" : "unavailable",
  );
  const [room, setRoom] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [devices, setDevices] = useState<ShareDevice[]>([]);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isCancelled = false;
    void detectDeviceName().then((name) => {
      if (!isCancelled) setDeviceName(name || "Device");
    });
    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!signalingConfigured || !deviceName) return;
    let isCancelled = false;
    let stopWatching = () => {};
    let presence: SharePresence | null = null;
    setStatus("starting");
    setDevices([]);

    void deriveNetworkRoom().then((networkRoom) => {
      if (isCancelled) return;
      if (!networkRoom) {
        setStatus("offline");
        return;
      }
      if (announce) {
        let published: SharePresence;
        try {
          published = publishShareDevice(networkRoom, deviceId, deviceName);
        } catch {
          setStatus("unavailable");
          return;
        }
        if (isCancelled) {
          void published.close();
          return;
        }
        presence = published;
      }
      setRoom(networkRoom);
      setStatus("ready");
      stopWatching = watchShareDevices(networkRoom, (found) => {
        if (isCancelled) return;
        setDevices(
          newestPerDevice(found.filter((device) => device.id !== deviceId)),
        );
      });
    });

    return () => {
      isCancelled = true;
      stopWatching();
      void presence?.close();
    };
  }, [announce, attempt, deviceId, deviceName]);

  return {
    status,
    room,
    deviceId,
    deviceName: deviceName ?? "This device",
    devices,
    refresh: () => setAttempt((count) => count + 1),
  };
};

/* A device that reloads announces itself under a new id while its old row is
   still counting down to stale, so only the newer of the two is listed. */
const newestPerDevice = (devices: ShareDevice[]): ShareDevice[] => {
  const byName = new Map<string, ShareDevice>();
  for (const device of devices) {
    const seen = byName.get(device.name);
    if (!seen || device.lastSeen > seen.lastSeen)
      byName.set(device.name, device);
  }
  return [...byName.values()];
};
