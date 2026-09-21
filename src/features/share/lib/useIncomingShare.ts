import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "../../../store/useStore";
import { useBackgroundKeepAlive } from "../../../hooks/useBackgroundKeepAlive";
import { useScreenWakeLock } from "../../../hooks/useScreenWakeLock";
import {
  receiveLibraryFrom,
  type ReceiveState,
  type ShareOfferDetails,
} from "./shareSession";
import { watchIncomingCalls } from "./shareSignaling";

/** The only stages worth a screen of their own; the rest are over. */
export type IncomingStage = "asking" | "receiving" | "importing";

/** What is being offered to this device, and how far it has got. */
export interface IncomingShare {
  fromName: string;
  summary: string;
  bytes: number;
  stage: IncomingStage;
  receivedBytes: number;
}

export interface IncomingShares {
  incoming: IncomingShare | null;
  accept: () => void;
  decline: () => void;
  /** Stops taking in what is already arriving. */
  stop: () => void;
}

/* Everything shared arrives as a merge, so a device keeps what it already has
   and the incoming copy wins wherever the two disagree. */
const IMPORT_MODE = "merge-imported" as const;

const LIVE_STAGES: readonly ReceiveState[] = [
  "asking",
  "receiving",
  "importing",
];

const isLiveStage = (state: ReceiveState): state is IncomingStage =>
  LIVE_STAGES.includes(state);

export const useIncomingShare = (
  room: string | null,
  deviceId: string,
): IncomingShares => {
  const importData = useStore((s) => s.importData);
  const pushToast = useStore((s) => s.pushToast);
  const [incoming, setIncoming] = useState<IncomingShare | null>(null);
  const decideRef = useRef<((accepted: boolean) => void) | null>(null);
  const isBusyRef = useRef(false);
  const stoppedRef = useRef(false);

  const isWorking = incoming !== null && incoming.stage !== "asking";
  /* A locked phone freezes the page, which would otherwise stall what is
     already arriving until someone picks it up again. */
  useScreenWakeLock(isWorking);
  useBackgroundKeepAlive(isWorking);

  const patch = useCallback((changes: Partial<IncomingShare>) => {
    setIncoming((current) => (current ? { ...current, ...changes } : current));
  }, []);

  useEffect(() => {
    if (!room) return;
    const handled = new Set<string>();

    const stopWatching = watchIncomingCalls(room, deviceId, (call) => {
      const key = `${call.callerId}:${call.offerSdp}`;
      if (handled.has(key)) return;
      handled.add(key);

      /* One at a time: a second device is turned away rather than left
         waiting while this one is still being taken in. */
      const busy = isBusyRef.current;
      if (!busy) isBusyRef.current = true;

      void receiveLibraryFrom({
        room,
        deviceId,
        call,
        onOffer: (details: ShareOfferDetails) => {
          if (busy) return Promise.resolve(false);
          stoppedRef.current = false;
          setIncoming({
            fromName: details.name,
            summary: details.summary,
            bytes: details.bytes,
            stage: "asking",
            receivedBytes: 0,
          });
          return new Promise<boolean>((resolve) => {
            decideRef.current = resolve;
          });
        },
        onState: (state) => {
          if (isLiveStage(state)) patch({ stage: state });
        },
        onProgress: (receivedBytes) => patch({ receivedBytes }),
        importArchive: (file) => importData(file, IMPORT_MODE),
        onFinished: (state, message) => {
          if (busy) return;
          isBusyRef.current = false;
          decideRef.current = null;
          setIncoming(null);
          if (state === "done") pushToast(message || "Added to your library.");
          else if (state === "stopped") pushToast("That transfer was stopped.");
          else if (state === "failed")
            pushToast(message || "Nothing was added.", "error");
        },
        shouldStop: () => stoppedRef.current,
      });
    });

    return () => {
      stopWatching();
      stoppedRef.current = true;
      decideRef.current?.(false);
      decideRef.current = null;
    };
  }, [deviceId, importData, patch, pushToast, room]);

  const decide = (accepted: boolean) => {
    const resolve = decideRef.current;
    decideRef.current = null;
    resolve?.(accepted);
  };

  return {
    incoming,
    accept: () => decide(true),
    decline: () => {
      decide(false);
      setIncoming(null);
    },
    stop: () => {
      stoppedRef.current = true;
    },
  };
};
