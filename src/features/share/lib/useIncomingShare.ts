import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "../../../store/useStore";
import { useBackgroundKeepAlive } from "../../../hooks/useBackgroundKeepAlive";
import { useScreenWakeLock } from "../../../hooks/useScreenWakeLock";
import { connectFromNetworkCall } from "./networkShareConnection";
import type { ShareOfferMessage } from "./shareProtocol";
import type { PairedLink } from "./sharePairing";
import {
  receiveLibraryFrom,
  ShareStoppedError,
  waitForShareOffer,
  type ReceiveState,
  type ShareConnection,
  type ShareConnector,
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

/** A device that paired with this one by code and can send to it. */
export interface PairedSender {
  id: string;
  name: string;
}

export interface IncomingShares {
  incoming: IncomingShare | null;
  accept: () => void;
  decline: () => void;
  /** Stops taking in what is already arriving. */
  stop: () => void;
  pairedSenders: PairedSender[];
  /** Listens on a link paired by code for as long as it stays up. */
  adoptPairedLink: (paired: PairedLink) => void;
  disconnectSender: (senderId: string) => void;
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
  const [pairedSenders, setPairedSenders] = useState<PairedSender[]>([]);
  const decideRef = useRef<((accepted: boolean) => void) | null>(null);
  const isBusyRef = useRef(false);
  const stoppedRef = useRef(false);
  const pairedLinksRef = useRef(new Map<string, () => void>());

  const isWorking = incoming !== null && incoming.stage !== "asking";
  /* A locked phone freezes the page, which would otherwise stall what is
     already arriving until someone picks it up again. */
  useScreenWakeLock(isWorking);
  useBackgroundKeepAlive(isWorking);

  const patch = useCallback((changes: Partial<IncomingShare>) => {
    setIncoming((current) => (current ? { ...current, ...changes } : current));
  }, []);

  const takeIn = useCallback(
    (connect: ShareConnector, offer?: ShareOfferMessage): Promise<void> => {
      /* One at a time: a second device is turned away rather than left
         waiting while this one is still being taken in. */
      const busy = isBusyRef.current;
      if (!busy) isBusyRef.current = true;

      return receiveLibraryFrom({
        connect,
        offer,
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
    },
    [importData, patch, pushToast],
  );

  useEffect(() => {
    if (!room) return;
    const handled = new Set<string>();

    const stopWatching = watchIncomingCalls(room, deviceId, (call) => {
      const key = `${call.callerId}:${call.offerSdp}`;
      if (handled.has(key)) return;
      handled.add(key);
      void takeIn(connectFromNetworkCall({ room, deviceId, call }));
    });

    return stopWatching;
  }, [deviceId, room, takeIn]);

  const adoptPairedLink = useCallback(
    (paired: PairedLink) => {
      const senderId = crypto.randomUUID();
      const { channel } = paired;
      const connection: ShareConnection = { channel, release: async () => {} };
      let isOver = false;

      const end = () => {
        if (isOver) return;
        isOver = true;
        paired.link.close();
        pairedLinksRef.current.delete(senderId);
        setPairedSenders((current) =>
          current.filter((sender) => sender.id !== senderId),
        );
      };

      pairedLinksRef.current.set(senderId, end);
      setPairedSenders((current) => [
        ...current,
        { id: senderId, name: paired.peerName },
      ]);
      channel.addEventListener("close", end);

      void (async () => {
        while (!isOver && channel.readyState === "open") {
          let offer: ShareOfferMessage;
          try {
            offer = await waitForShareOffer(channel, null, () => isOver);
          } catch (error) {
            /* A stop that lands between two sends only ends the one that was
               already over; the link itself is still good for the next. */
            if (error instanceof ShareStoppedError && !isOver) continue;
            break;
          }
          await takeIn(() => Promise.resolve(connection), offer);
        }
        end();
      })();
    },
    [takeIn],
  );

  useEffect(() => {
    const pairedLinks = pairedLinksRef.current;
    return () => {
      stoppedRef.current = true;
      decideRef.current?.(false);
      decideRef.current = null;
      for (const end of [...pairedLinks.values()]) end();
    };
  }, []);

  const disconnectSender = useCallback((senderId: string) => {
    pairedLinksRef.current.get(senderId)?.();
  }, []);

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
    pairedSenders,
    adoptPairedLink,
    disconnectSender,
  };
};
