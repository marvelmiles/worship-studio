import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../../../store/useStore";
import {
  isSelectionEmpty,
  type BackupSelection,
} from "../../../lib/shareSelection";
import { useOutgoingShares, type OutgoingShareMap } from "./useOutgoingShares";
import { useShareLobby, type LobbyStatus } from "./useShareLobby";
import type { ShareDevice } from "./shareSignaling";

export interface QuickShareOptions {
  /** Whether this screen also offers itself as somewhere data can arrive. */
  announce?: boolean;
  /** Runs once the send is over and it reached someone, so the screen can clear itself. */
  onSent?: () => void;
  /** Runs when a send ends with nothing delivered, so the screen starts over. */
  onReset?: () => void;
}

export interface QuickShare {
  status: LobbyStatus;
  deviceName: string;
  room: string | null;
  deviceId: string;
  /**
   * The devices worth showing: deduplicated, minus any that gave up or were
   * stopped, plus any still being sent to even if the network briefly lost it.
   */
  devices: ShareDevice[];
  transfers: OutgoingShareMap;
  selectedDeviceIds: string[];
  toggleDevice: (deviceId: string) => void;
  isSearching: boolean;
  isBusy: boolean;
  progress: number | null;
  canSend: boolean;
  send: (selection: BackupSelection) => Promise<void>;
  stopDevice: (deviceId: string) => void;
  stopAll: () => void;
  /** Stops anything still going, then looks for devices again. */
  refresh: () => void;
}

/**
 * One quick share conversation, as both the page and the single-item modal
 * need it: who is here, what is going to them, and how far it has got.
 */
export const useQuickShare = ({
  announce = true,
  onSent,
  onReset,
}: QuickShareOptions = {}): QuickShare => {
  const pushToast = useStore((s) => s.pushToast);
  const lobby = useShareLobby({ announce });
  const [pickedDeviceIds, setPickedDeviceIds] = useState<string[]>([]);
  const [lostDeviceIds, setLostDeviceIds] = useState<string[]>([]);
  const [stoppedDeviceIds, setStoppedDeviceIds] = useState<string[]>([]);
  const callbacksRef = useRef({ onSent, onReset });

  useEffect(() => {
    callbacksRef.current = { onSent, onReset };
  });

  const handleDeviceLost = useCallback(
    (device: ShareDevice, reason: string) => {
      setLostDeviceIds((current) => [...new Set([...current, device.id])]);
      setPickedDeviceIds((current) => current.filter((id) => id !== device.id));
      pushToast(reason || `${device.name} did not take it.`, "error");
    },
    [pushToast],
  );

  const handleAllSent = useCallback(() => {
    setPickedDeviceIds([]);
    setStoppedDeviceIds([]);
    callbacksRef.current.onSent?.();
  }, []);

  const handleNothingLeft = useCallback(() => {
    setPickedDeviceIds([]);
    setStoppedDeviceIds([]);
    callbacksRef.current.onReset?.();
  }, []);

  const outgoing = useOutgoingShares({
    room: lobby.room,
    deviceId: lobby.deviceId,
    deviceName: lobby.deviceName,
    onDeviceLost: handleDeviceLost,
    onAllSent: handleAllSent,
    onNothingLeft: handleNothingLeft,
  });

  const devices = useMemo(() => {
    const hidden = new Set([...lostDeviceIds, ...stoppedDeviceIds]);
    const listed = lobby.devices.filter((device) => !hidden.has(device.id));
    /* A sleeping or minimised device drops out of the network list while the
       link between the two is still carrying data, so its card stays put. */
    const sending = Object.values(outgoing.transfers)
      .filter((row) => !listed.some((device) => device.id === row.deviceId))
      .map((row) => ({ id: row.deviceId, name: row.name, lastSeen: 0 }));
    return [...listed, ...sending];
  }, [lobby.devices, lostDeviceIds, outgoing.transfers, stoppedDeviceIds]);

  /* A device that has since left the network stays out of the selection
     without needing a round of state to prune it. */
  const selectedDeviceIds = useMemo(
    () =>
      pickedDeviceIds.filter((id) =>
        devices.some((device) => device.id === id),
      ),
    [devices, pickedDeviceIds],
  );

  const toggleDevice = useCallback((deviceId: string) => {
    setPickedDeviceIds((current) =>
      current.includes(deviceId)
        ? current.filter((id) => id !== deviceId)
        : [...current, deviceId],
    );
  }, []);

  const { reset, stopDevice: stopOutgoingDevice } = outgoing;
  const refresh = useCallback(() => {
    const wasBusy = outgoing.isBusy;
    reset();
    setLostDeviceIds([]);
    setStoppedDeviceIds([]);
    setPickedDeviceIds([]);
    lobby.refresh();
    if (wasBusy) callbacksRef.current.onReset?.();
  }, [lobby, outgoing.isBusy, reset]);

  const stopDevice = useCallback(
    (deviceId: string) => {
      setStoppedDeviceIds((current) => [...new Set([...current, deviceId])]);
      setPickedDeviceIds((current) => current.filter((id) => id !== deviceId));
      stopOutgoingDevice(deviceId);
    },
    [stopOutgoingDevice],
  );

  const targets = useMemo(
    () => devices.filter((device) => selectedDeviceIds.includes(device.id)),
    [devices, selectedDeviceIds],
  );

  const { send } = outgoing;
  const sendSelection = useCallback(
    (selection: BackupSelection) => send(targets, selection),
    [send, targets],
  );

  return {
    status: lobby.status,
    deviceName: lobby.deviceName,
    room: lobby.room,
    deviceId: lobby.deviceId,
    devices,
    transfers: outgoing.transfers,
    selectedDeviceIds,
    toggleDevice,
    isSearching: lobby.status === "starting",
    isBusy: outgoing.isBusy,
    progress: outgoing.progress,
    canSend: lobby.status === "ready" && !outgoing.isBusy && targets.length > 0,
    send: sendSelection,
    stopDevice,
    stopAll: outgoing.stopAll,
    refresh,
  };
};

export const canSendSelection = (
  quickShare: QuickShare,
  selection: BackupSelection,
): boolean => quickShare.canSend && !isSelectionEmpty(selection);
