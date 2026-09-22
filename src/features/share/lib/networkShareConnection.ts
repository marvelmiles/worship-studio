import { acceptShareLink, completeShareLink, openShareLink } from "./sharePeer";
import type { ShareConnector } from "./shareSession";
import {
  answerShareCall,
  callShareDevice,
  clearShareCall,
  type IncomingCall,
  type ShareDevice,
} from "./shareSignaling";

interface CallDeviceOptions {
  room: string;
  fromId: string;
  fromName: string;
  target: ShareDevice;
}

/** Reaches a device found on the network list, through the handshake relay. */
export const connectToNetworkDevice =
  ({ room, fromId, fromName, target }: CallDeviceOptions): ShareConnector =>
  async () => {
    let opened: Awaited<ReturnType<typeof openShareLink>>;
    try {
      opened = await openShareLink();
    } catch {
      throw new Error(`Could not reach ${target.name}.`);
    }
    const { link, offerSdp } = opened;

    const call = callShareDevice(room, target.id, fromId, fromName, offerSdp);
    let isAnswered = false;
    call.onAnswer((answerSdp) => {
      if (isAnswered) return;
      isAnswered = true;
      void completeShareLink(link, answerSdp).catch(() => {});
    });

    const release = async () => {
      await call.close();
      await clearShareCall(room, target.id, fromId);
      link.close();
    };

    try {
      return { channel: await link.ready, release };
    } catch (error) {
      await release();
      throw error;
    }
  };

interface AnswerCallOptions {
  room: string;
  deviceId: string;
  call: IncomingCall;
}

/** Answers an offer that arrived in this device's inbox on the relay. */
export const connectFromNetworkCall =
  ({ room, deviceId, call }: AnswerCallOptions): ShareConnector =>
  async () => {
    let accepted: Awaited<ReturnType<typeof acceptShareLink>>;
    try {
      accepted = await acceptShareLink(call.offerSdp);
    } catch {
      throw new Error("The devices could not reach each other.");
    }
    const { link, answerSdp } = accepted;

    const release = async () => {
      link.close();
      await clearShareCall(room, deviceId, call.callerId);
    };

    try {
      await answerShareCall(room, deviceId, call.callerId, answerSdp);
    } catch {
      await release();
      throw new Error("The devices could not reach each other.");
    }

    try {
      return { channel: await link.ready, release };
    } catch (error) {
      await release();
      throw error;
    }
  };
