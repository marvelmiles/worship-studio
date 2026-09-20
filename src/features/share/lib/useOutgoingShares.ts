import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "../../../store/useStore";
import { packBackupZip } from "../../../lib/backup";
import {
  buildBackup,
  describeSelection,
  type BackupSource,
} from "../../../lib/backupPayload";
import {
  isSelectionEmpty,
  selectionCount,
  type BackupSelection,
} from "../../../lib/shareSelection";
import { sendLibraryTo, type SendState } from "./shareSession";
import type { ShareDevice } from "./shareSignaling";

export interface OutgoingShare {
  deviceId: string;
  name: string;
  state: SendState | "queued";
  sentBytes: number;
  totalBytes: number;
  message: string;
}

export interface OutgoingShares {
  /** What is being sent, one row per device, in the order they are handed it. */
  transfers: OutgoingShare[];
  isBusy: boolean;
  /** How far the archive itself is from being built, before any of it moves. */
  packing: number | null;
  send: (targets: ShareDevice[], selection: BackupSelection) => Promise<void>;
  clear: () => void;
}

const sourceFrom = (
  state: ReturnType<typeof useStore.getState>,
): BackupSource => ({
  manuscripts: state.manuscripts,
  scriptures: state.scriptures,
  media: state.media,
  themes: state.themes,
  backgrounds: state.backgrounds,
  audio: state.audio,
  overlayPresets: state.overlayPresets,
  prefs: state.prefs,
});

export const useOutgoingShares = (
  room: string | null,
  deviceId: string,
  deviceName: string,
): OutgoingShares => {
  const pushToast = useStore((s) => s.pushToast);
  const [transfers, setTransfers] = useState<OutgoingShare[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [packing, setPacking] = useState<number | null>(null);
  const stoppedRef = useRef(false);

  // Leaving the page stops the queue rather than sending on in the background.
  useEffect(
    () => () => {
      stoppedRef.current = true;
    },
    [],
  );

  const patch = useCallback(
    (targetId: string, changes: Partial<OutgoingShare>) => {
      setTransfers((rows) =>
        rows.map((row) =>
          row.deviceId === targetId ? { ...row, ...changes } : row,
        ),
      );
    },
    [],
  );

  const send = useCallback(
    async (targets: ShareDevice[], selection: BackupSelection) => {
      if (!room || targets.length === 0 || isSelectionEmpty(selection)) return;
      stoppedRef.current = false;
      setIsBusy(true);
      setTransfers(
        targets.map((target) => ({
          deviceId: target.id,
          name: target.name,
          state: "queued" as const,
          sentBytes: 0,
          totalBytes: 0,
          message: "Waiting its turn",
        })),
      );

      const source = sourceFrom(useStore.getState());
      const summary = describeSelection(source, selection);

      let archive: Blob;
      try {
        setPacking(0);
        const { payload, fileIds } = buildBackup(source, selection);
        archive = await packBackupZip(payload, fileIds, (fraction) =>
          setPacking(Math.round(fraction * 100)),
        );
      } catch {
        setPacking(null);
        setIsBusy(false);
        setTransfers((rows) =>
          rows.map((row) => ({
            ...row,
            state: "failed" as const,
            message: "Could not gather that data.",
          })),
        );
        pushToast("Could not gather that data to send.", "error");
        return;
      }
      setPacking(null);

      /* One device at a time: a single WiFi link carries the whole archive far
         more steadily than several fighting over it. */
      for (const target of targets) {
        if (stoppedRef.current) break;
        patch(target.id, { totalBytes: archive.size, message: "Connecting" });
        const outcome = await sendLibraryTo({
          room,
          fromId: deviceId,
          fromName: deviceName,
          target,
          archive,
          summary,
          items: selectionCount(selection),
          onState: (state) => patch(target.id, { state, message: "" }),
          onProgress: (sentBytes) => patch(target.id, { sentBytes }),
          shouldStop: () => stoppedRef.current,
        });
        patch(target.id, {
          state: outcome.state,
          message: outcome.message,
        });
      }

      setIsBusy(false);
    },
    [deviceId, deviceName, patch, pushToast, room],
  );

  const clear = useCallback(() => {
    stoppedRef.current = true;
    setTransfers([]);
    setIsBusy(false);
    setPacking(null);
  }, []);

  return { transfers, isBusy, packing, send, clear };
};
