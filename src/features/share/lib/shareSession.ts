import {
  parseShareMessage,
  sendShareMessage,
  type ShareMessage,
  type ShareOfferMessage,
} from "./shareProtocol";
import {
  createArchiveCollector,
  sendArchive,
  whenFlushed,
} from "./shareTransfer";

/** How long the other side has to say yes or no before the send gives up. */
const DECISION_TIMEOUT_MS = 90 * 1000;
/** How long to wait for the receiving device to finish taking it in. */
const IMPORT_TIMEOUT_MS = 10 * 60 * 1000;
/** How often a wait checks whether the person here has stopped it. */
const STOP_POLL_MS = 250;

/** Raised wherever a wait ends because either side stopped the transfer. */
export class ShareStoppedError extends Error {
  constructor() {
    super("The transfer was stopped.");
    this.name = "ShareStoppedError";
  }
}

export type SendState =
  | "connecting"
  | "asking"
  | "sending"
  | "importing"
  | "done"
  | "declined"
  | "stopped"
  | "failed";

export type ReceiveState =
  | "asking"
  | "receiving"
  | "importing"
  | "done"
  | "declined"
  | "stopped"
  | "failed";

export interface ShareOfferDetails {
  name: string;
  summary: string;
  items: number;
  bytes: number;
}

export interface SendOutcome {
  state: Extract<SendState, "done" | "declined" | "stopped" | "failed">;
  message: string;
}

/** An open channel to another device, held for one conversation. */
export interface ShareConnection {
  channel: RTCDataChannel;
  /** Ends the conversation. A link paired with a code stays up for the next one. */
  release: () => Promise<void>;
}

/**
 * Reaches the other device however this pair of devices found each other, and
 * throws a message fit to show when it cannot.
 */
export type ShareConnector = () => Promise<ShareConnection>;

/** Waits for the next control message the other side sends. */
const nextControl = (
  channel: RTCDataChannel,
  wanted: ShareMessage["type"][],
  timeoutMs: number | null,
  shouldStop: () => boolean,
): Promise<ShareMessage> =>
  new Promise((resolve, reject) => {
    const stop = () => {
      if (timer !== null) window.clearTimeout(timer);
      window.clearInterval(watcher);
      channel.removeEventListener("message", onMessage);
      channel.removeEventListener("close", onClose);
    };
    const timer =
      timeoutMs === null
        ? null
        : window.setTimeout(() => {
            stop();
            reject(new Error("The other device did not reply."));
          }, timeoutMs);
    const watcher = window.setInterval(() => {
      if (!shouldStop()) return;
      stop();
      reject(new ShareStoppedError());
    }, STOP_POLL_MS);
    const onClose = () => {
      stop();
      reject(new Error("The link closed."));
    };
    const onMessage = (event: MessageEvent<unknown>) => {
      const message = parseShareMessage(event.data);
      if (!message) return;
      if (message.type === "cancel") {
        stop();
        reject(new ShareStoppedError());
        return;
      }
      if (!wanted.includes(message.type)) return;
      stop();
      resolve(message);
    };
    channel.addEventListener("message", onMessage);
    channel.addEventListener("close", onClose);
    if (channel.readyState !== "open") onClose();
  });

/** Waits for the other side to say what it wants to send, or null to wait on. */
export const waitForShareOffer = async (
  channel: RTCDataChannel,
  timeoutMs: number | null,
  shouldStop: () => boolean,
): Promise<ShareOfferMessage> => {
  const message = await nextControl(channel, ["offer"], timeoutMs, shouldStop);
  if (message.type !== "offer") throw new Error("Nothing was offered.");
  return message;
};

/** Waits for the other side to say who it is, once a link is first opened. */
export const waitForShareHello = async (
  channel: RTCDataChannel,
  timeoutMs: number,
): Promise<string | null> => {
  try {
    const message = await nextControl(
      channel,
      ["hello"],
      timeoutMs,
      () => false,
    );
    return message.type === "hello" ? message.name : null;
  } catch {
    return null;
  }
};

const failureMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

interface SendOptions {
  connect: ShareConnector;
  fromName: string;
  targetName: string;
  archive: Blob;
  summary: string;
  items: number;
  onState: (state: SendState) => void;
  onProgress: (sentBytes: number) => void;
  shouldStop: () => boolean;
}

/**
 * Hands one device the archive: the two link up, the other side is told what
 * is coming, and nothing moves until it says yes.
 */
export const sendLibraryTo = async ({
  connect,
  fromName,
  targetName,
  archive,
  summary,
  items,
  onState,
  onProgress,
  shouldStop,
}: SendOptions): Promise<SendOutcome> => {
  onState("connecting");

  let connection: ShareConnection;
  try {
    connection = await connect();
  } catch (error) {
    onState("failed");
    return {
      state: "failed",
      message: failureMessage(error, `Could not reach ${targetName}.`),
    };
  }
  const { channel } = connection;

  const finish = async (outcome: SendOutcome): Promise<SendOutcome> => {
    /* Saying so first spares the other side a wait that would otherwise only
       end when the link times out. */
    if (outcome.state === "stopped") {
      sendShareMessage(channel, { type: "cancel" });
      await whenFlushed(channel);
    }
    await connection.release();
    onState(outcome.state);
    return outcome;
  };

  try {
    if (shouldStop()) throw new ShareStoppedError();

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
      shouldStop,
    );
    if (decision.type === "decline") {
      return finish({ state: "declined", message: `${targetName} said no.` });
    }

    onState("sending");
    const sent = await sendArchive({
      channel,
      archive,
      onProgress,
      shouldStop,
    });
    if (!sent) {
      if (shouldStop()) throw new ShareStoppedError();
      return finish({
        state: "failed",
        message: `The send to ${targetName} stopped early.`,
      });
    }
    sendShareMessage(channel, { type: "sent", bytes: archive.size });

    onState("importing");
    const result = await nextControl(
      channel,
      ["result"],
      IMPORT_TIMEOUT_MS,
      shouldStop,
    );
    if (result.type !== "result" || !result.ok) {
      return finish({
        state: "failed",
        message:
          result.type === "result"
            ? result.message
            : `${targetName} could not take it in.`,
      });
    }
    return finish({ state: "done", message: result.message });
  } catch (error) {
    if (error instanceof ShareStoppedError || shouldStop()) {
      return finish({ state: "stopped", message: "" });
    }
    return finish({
      state: "failed",
      message: failureMessage(error, "The transfer failed."),
    });
  }
};

interface ReceiveOptions {
  connect: ShareConnector;
  /** What is on offer, when it has already been read off a link that stays up. */
  offer?: ShareOfferMessage;
  /** Asks the person whether to take what is being offered. */
  onOffer: (details: ShareOfferDetails) => Promise<boolean>;
  onState: (state: ReceiveState) => void;
  onProgress: (receivedBytes: number) => void;
  /** Reads the archive into the library, and says how it went. */
  importArchive: (file: File) => Promise<{ ok: boolean; message: string }>;
  onFinished: (state: ReceiveState, message: string) => void;
  /** Whether the person here has stopped taking it in. */
  shouldStop: () => boolean;
}

/** Takes one offered library in, once the person here has accepted it. */
export const receiveLibraryFrom = async ({
  connect,
  offer: knownOffer,
  onOffer,
  onState,
  onProgress,
  importArchive,
  onFinished,
  shouldStop,
}: ReceiveOptions): Promise<void> => {
  let connection: ShareConnection;
  try {
    connection = await connect();
  } catch (error) {
    onFinished(
      "failed",
      failureMessage(error, "The devices could not reach each other."),
    );
    return;
  }

  const { channel } = connection;
  const collector = createArchiveCollector();

  const close = async (didStop: boolean) => {
    if (didStop) {
      sendShareMessage(channel, { type: "cancel" });
      await whenFlushed(channel);
    }
    await connection.release();
  };

  try {
    const offer =
      knownOffer ??
      (await waitForShareOffer(channel, DECISION_TIMEOUT_MS, shouldStop));

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
      await close(false);
      onFinished("declined", "You turned that down.");
      return;
    }

    sendShareMessage(channel, { type: "accept" });
    onState("receiving");

    await new Promise<void>((resolve, reject) => {
      const stop = () => {
        window.clearInterval(watcher);
        channel.removeEventListener("message", onMessage);
        channel.removeEventListener("close", onClose);
      };
      const watcher = window.setInterval(() => {
        if (!shouldStop()) return;
        stop();
        reject(new ShareStoppedError());
      }, STOP_POLL_MS);
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
        if (message?.type === "cancel") {
          stop();
          reject(new ShareStoppedError());
          return;
        }
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

    onState("importing");
    sendShareMessage(channel, { type: "importing" });

    const result = await importArchive(collector.toFile("quick-share.zip"));
    sendShareMessage(channel, {
      type: "result",
      ok: result.ok,
      message: result.message,
    });
    await whenFlushed(channel);
    await close(false);
    onFinished(result.ok ? "done" : "failed", result.message);
  } catch (error) {
    const didStop = error instanceof ShareStoppedError;
    await close(didStop);
    onFinished(
      didStop ? "stopped" : "failed",
      didStop
        ? "The transfer was stopped."
        : failureMessage(error, "The transfer failed."),
    );
  } finally {
    collector.reset();
  }
};
