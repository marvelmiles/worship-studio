import {
  decodeSignal,
  encodeSignal,
  type SignalKind,
} from "../../stream/lib/streamSignal";
import {
  acceptShareLink,
  completeShareLink,
  LINK_TIMEOUT_MS,
  openShareLink,
  type ShareLink,
} from "./sharePeer";
import { sendShareMessage } from "./shareProtocol";
import { waitForShareHello } from "./shareSession";

const HELLO_TIMEOUT_MS = 8000;
const FALLBACK_PEER_NAME = "Paired device";
const UNREACHABLE_MESSAGE =
  "The devices could not reach each other. Check that both are on the same WiFi or hotspot.";

/** A link two devices set up by reading each other's codes, with no server. */
export interface PairedLink {
  link: ShareLink;
  channel: RTCDataChannel;
  peerName: string;
}

export type PairingCodeKind = "invite" | "reply";

const SIGNAL_KIND: Record<PairingCodeKind, SignalKind> = {
  invite: "share-offer",
  reply: "share-answer",
};

/** The connection details inside a pairing code, or null if it is not one. */
export const readPairingCode = (
  text: string,
  kind: PairingCodeKind,
): string | null => {
  const signal = decodeSignal(text);
  return signal?.kind === SIGNAL_KIND[kind] ? signal.sdp : null;
};

const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = window.setTimeout(
      () => reject(new Error(message)),
      timeoutMs,
    );
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });

const greet = async (
  link: ShareLink,
  channel: RTCDataChannel,
  ownName: string,
): Promise<PairedLink> => {
  sendShareMessage(channel, { type: "hello", name: ownName });
  const peerName = await waitForShareHello(channel, HELLO_TIMEOUT_MS);
  return { link, channel, peerName: peerName ?? FALLBACK_PEER_NAME };
};

const closeUnlessPaired = (link: ShareLink, isPaired: () => boolean) => () => {
  if (!isPaired()) link.close();
};

/** The sending side: it shows an invite, then reads the other device's reply. */
export interface PairingInvite {
  code: string;
  /** Takes the reply's connection details and waits for the link to open. */
  complete: (replySdp: string, ownName: string) => Promise<PairedLink>;
  cancel: () => void;
}

export const createPairingInvite = async (): Promise<PairingInvite> => {
  const { link, offerSdp } = await openShareLink({ timeoutMs: null });
  let isPaired = false;

  return {
    code: encodeSignal(SIGNAL_KIND.invite, offerSdp),
    complete: async (replySdp, ownName) => {
      try {
        await completeShareLink(link, replySdp);
      } catch {
        throw new Error(
          "That reply belongs to a different code. Start again on both devices.",
        );
      }
      const channel = await withTimeout(
        link.ready,
        LINK_TIMEOUT_MS,
        UNREACHABLE_MESSAGE,
      ).catch(() => {
        throw new Error(UNREACHABLE_MESSAGE);
      });
      isPaired = true;
      return greet(link, channel, ownName);
    },
    cancel: closeUnlessPaired(link, () => isPaired),
  };
};

/** The receiving side: it reads the invite and shows a reply to scan back. */
export interface PairingReply {
  code: string;
  /** Settles once the sending device has read the reply and the link is up. */
  connected: Promise<PairedLink>;
  cancel: () => void;
}

export const answerPairingInvite = async (
  inviteSdp: string,
  ownName: string,
): Promise<PairingReply> => {
  const { link, answerSdp } = await acceptShareLink(inviteSdp, {
    timeoutMs: null,
  });
  let isPaired = false;

  const connected = link.ready.then(
    (channel) => {
      isPaired = true;
      return greet(link, channel, ownName);
    },
    () => {
      throw new Error(UNREACHABLE_MESSAGE);
    },
  );

  return {
    code: encodeSignal(SIGNAL_KIND.reply, answerSdp),
    connected,
    cancel: closeUnlessPaired(link, () => isPaired),
  };
};
