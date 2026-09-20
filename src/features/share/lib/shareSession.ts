import { acceptShareLink, completeShareLink, openShareLink } from "./sharePeer";
import {
  parseShareMessage,
  sendShareMessage,
  type ShareMessage,
} from "./shareProtocol";
import {
  answerShareCall,
  callShareDevice,
  clearShareCall,
  type IncomingCall,
  type ShareDevice,
} from "./shareSignaling";
import {
  createArchiveCollector,
  sendArchive,
  whenFlushed,
} from "./shareTransfer";

/** How long the other side has to say yes or no before the send gives up. */
const DECISION_TIMEOUT_MS = 90 * 1000;
/** How long to wait for the receiving device to finish taking it in. */
const IMPORT_TIMEOUT_MS = 10 * 60 * 1000;

export type SendState =
  | "connecting"
  | "asking"
  | "sending"
  | "importing"
  | "done"
  | "declined"
  | "failed";

export type ReceiveState =
  "asking" | "receiving" | "importing" | "done" | "declined" | "failed";

export interface ShareOfferDetails {
  name: string;
  summary: string;
  items: number;
  bytes: number;
}

export interface SendOutcome {
  state: Extract<SendState, "done" | "declined" | "failed">;
  message: string;
}

/** Waits for the next control message the other side sends. */
const nextControl = (
  channel: RTCDataChannel,
  wanted: ShareMessage["type"][],
  timeoutMs: number,
): Promise<ShareMessage> =>
  new Promise((resolve, reject) => {
    const stop = () => {
      window.clearTimeout(timer);
      channel.removeEventListener("message", onMessage);
      channel.removeEventListener("close", onClose);
    };
    const timer = window.setTimeout(() => {
      stop();
      reject(new Error("The other device did not reply."));
    }, timeoutMs);
    const onClose = () => {
      stop();
      reject(new Error("The link closed."));
    };
    const onMessage = (event: MessageEvent<unknown>) => {
      const message = parseShareMessage(event.data);
      if (!message || !wanted.includes(message.type)) return;
      stop();
      resolve(message);
    };
    channel.addEventListener("message", onMessage);
    channel.addEventListener("close", onClose);
  });

interface SendOptions {
  room: string;
  fromId: string;
  fromName: string;
  target: ShareDevice;
  archive: Blob;
  summary: string;
  items: number;
  onState: (state: SendState) => void;
  onProgress: (sentBytes: number) => void;
  shouldStop: () => boolean;
}

/**
 * Hands one device the archive: the two link up over the network, the other
 * side is told what is coming, and nothing moves until it says yes.
 */
export const sendLibraryTo = async ({
  room,
  fromId,
  fromName,
  target,
  archive,
  summary,
  items,
  onState,
  onProgress,
  shouldStop,
}: SendOptions): Promise<SendOutcome> => {
  onState("connecting");
  const { link, offerSdp } = await openShareLink();
  const call = callShareDevice(room, target.id, fromId, fromName, offerSdp);
  let answered = false;
  call.onAnswer((answerSdp) => {
    if (answered) return;
    answered = true;
    void completeShareLink(link, answerSdp).catch(() => {});
  });

  const finish = async (outcome: SendOutcome): Promise<SendOutcome> => {
    await call.close();
    await clearShareCall(room, target.id, fromId);
    link.close();
    onState(outcome.state);
    return outcome;
  };

  try {
    const channel = await link.ready;
    sendShareMessage(channel, {
      type: "offer",
      name: fromName,
      summary,
      items,
      bytes: archive.size,
    });

    onState("asking");
    const decision = await nextControl(
      channel,
      ["accept", "decline"],
      DECISION_TIMEOUT_MS,
    );
    if (decision.type === "decline") {
      return finish({ state: "declined", message: `${target.name} said no.` });
    }

    onState("sending");
    const sent = await sendArchive({
      channel,
      archive,
      onProgress,
      shouldStop,
    });
    if (!sent) {
      return finish({
        state: "failed",
        message: `The send to ${target.name} stopped early.`,
      });
    }
    sendShareMessage(channel, { type: "sent", bytes: archive.size });

    onState("importing");
    const result = await nextControl(channel, ["result"], IMPORT_TIMEOUT_MS);
    if (result.type !== "result" || !result.ok) {
      return finish({
        state: "failed",
        message:
          result.type === "result"
            ? result.message
            : `${target.name} could not take it in.`,
      });
    }
    return finish({ state: "done", message: result.message });
  } catch (error) {
    return finish({
      state: "failed",
      message: error instanceof Error ? error.message : "The transfer failed.",
    });
  }
};

interface ReceiveOptions {
  room: string;
  deviceId: string;
  call: IncomingCall;
  /** Asks the person whether to take what is being offered. */
  onOffer: (details: ShareOfferDetails) => Promise<boolean>;
  onState: (state: ReceiveState) => void;
  onProgress: (receivedBytes: number) => void;
  /** Reads the archive into the library, and says how it went. */
  importArchive: (file: File) => Promise<{ ok: boolean; message: string }>;
  onFinished: (state: ReceiveState, message: string) => void;
}

/** Takes one offered library in, once the person here has accepted it. */
export const receiveLibraryFrom = async ({
  room,
  deviceId,
  call,
  onOffer,
  onState,
  onProgress,
  importArchive,
  onFinished,
}: ReceiveOptions): Promise<void> => {
  const { link, answerSdp } = await acceptShareLink(call.offerSdp);
  const collector = createArchiveCollector();

  const close = async () => {
    link.close();
    await clearShareCall(room, deviceId, call.callerId);
  };

  try {
    await answerShareCall(room, deviceId, call.callerId, answerSdp);
    const channel = await link.ready;
    const offer = await nextControl(channel, ["offer"], DECISION_TIMEOUT_MS);
    if (offer.type !== "offer") throw new Error("Nothing was offered.");

    onState("asking");
    const accepted = await onOffer({
      name: offer.name,
      summary: offer.summary,
      items: offer.items,
      bytes: offer.bytes,
    });
    if (!accepted) {
      sendShareMessage(channel, { type: "decline" });
      await whenFlushed(channel);
      await close();
      onFinished("declined", "You turned that down.");
      return;
    }

    sendShareMessage(channel, { type: "accept" });
    onState("receiving");

    const done = new Promise<void>((resolve, reject) => {
      const stop = () => {
        channel.removeEventListener("message", onMessage);
        channel.removeEventListener("close", onClose);
      };
      const onClose = () => {
        stop();
        reject(new Error("The sending device disconnected."));
      };
      const onMessage = (event: MessageEvent<unknown>) => {
        if (event.data instanceof ArrayBuffer) {
          onProgress(collector.take(event.data));
          return;
        }
        const message = parseShareMessage(event.data);
        if (message?.type !== "sent") return;
        stop();
        if (collector.bytes < message.bytes) {
          reject(new Error("Some of it did not arrive."));
          return;
        }
        resolve();
      };
      channel.addEventListener("message", onMessage);
      channel.addEventListener("close", onClose);
    });

    await done;
    onState("importing");
    sendShareMessage(channel, { type: "importing" });

    const result = await importArchive(collector.toFile("quick-share.zip"));
    sendShareMessage(channel, {
      type: "result",
      ok: result.ok,
      message: result.message,
    });
    await whenFlushed(channel);
    await close();
    onFinished(result.ok ? "done" : "failed", result.message);
  } catch (error) {
    await close();
    onFinished(
      "failed",
      error instanceof Error ? error.message : "The transfer failed.",
    );
  } finally {
    collector.reset();
  }
};
