import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "../../../store/useStore";
import {
  receiveLibraryFrom,
  type ReceiveState,
  type ShareOfferDetails,
} from "./shareSession";
import { watchIncomingCalls } from "./shareSignaling";

/** What is being offered to this device, and how far it has got. */
export interface IncomingShare {
  fromName: string;
  summary: string;
  bytes: number;
  state: ReceiveState;
  receivedBytes: number;
  message: string;
}

export interface IncomingShares {
  incoming: IncomingShare | null;
  accept: () => void;
  decline: () => void;
  dismiss: () => void;
}

/* Everything shared arrives as a merge, so a device keeps what it already has
   and the incoming copy wins wherever the two disagree. */
const IMPORT_MODE = "merge-imported" as const;

export const useIncomingShare = (
  room: string | null,
  deviceId: string,
): IncomingShares => {
  const importData = useStore((s) => s.importData);
  const [incoming, setIncoming] = useState<IncomingShare | null>(null);
  const decideRef = useRef<((accepted: boolean) => void) | null>(null);
  const isBusyRef = useRef(false);

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
          setIncoming({
            fromName: details.name,
            summary: details.summary,
            bytes: details.bytes,
            state: "asking",
            receivedBytes: 0,
            message: "",
          });
          return new Promise<boolean>((resolve) => {
            decideRef.current = resolve;
          });
        },
        onState: (state) => patch({ state }),
        onProgress: (receivedBytes) => patch({ receivedBytes }),
        importArchive: (file) => importData(file, IMPORT_MODE),
        onFinished: (state, message) => {
          if (busy) return;
          isBusyRef.current = false;
          decideRef.current = null;
          patch({ state, message });
        },
      });
    });

    return () => {
      stopWatching();
      decideRef.current?.(false);
      decideRef.current = null;
    };
  }, [deviceId, importData, patch, room]);

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
    dismiss: () => setIncoming(null),
  };
};
