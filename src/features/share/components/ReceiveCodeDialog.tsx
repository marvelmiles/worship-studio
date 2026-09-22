import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { useStore } from "../../../store/useStore";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { ReadCode, ShowCode } from "../../stream/CodeExchange";
import { StreamStatusLine } from "../../stream/components/StreamStatusLine";
import { PairingStep } from "../../stream/receiver/PairingStep";
import {
  answerPairingInvite,
  readPairingCode,
  type PairedLink,
  type PairingReply,
} from "../lib/sharePairing";

interface ReceiveCodeDialogProps {
  open: boolean;
  deviceName: string;
  onClose: () => void;
  onConnected: (paired: PairedLink) => void;
}

/**
 * The receiving half of pairing by code: it reads the sending device's code
 * and shows a reply for it to read back.
 */
export const ReceiveCodeDialog = ({
  open,
  deviceName,
  onClose,
  onConnected,
}: ReceiveCodeDialogProps) => (
  <Modal open={open} onClose={onClose} title="Receive with a code" width={460}>
    {open && (
      <ReceiveSteps
        deviceName={deviceName}
        onClose={onClose}
        onConnected={onConnected}
      />
    )}
  </Modal>
);

type Phase = "reading" | "preparing" | "replying" | "failed";

const ReceiveSteps = ({
  deviceName,
  onClose,
  onConnected,
}: Omit<ReceiveCodeDialogProps, "open">) => {
  const pushToast = useStore((s) => s.pushToast);
  const [phase, setPhase] = useState<Phase>("reading");
  const [reply, setReply] = useState<PairingReply | null>(null);
  const [failure, setFailure] = useState("");
  const replyRef = useRef<PairingReply | null>(null);
  const isMountedRef = useRef(true);
  const callbacksRef = useRef({ onClose, onConnected });

  useEffect(() => {
    callbacksRef.current = { onClose, onConnected };
  });

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      replyRef.current?.cancel();
    };
  }, []);

  const fail = (message: string) => {
    if (!isMountedRef.current) return;
    setFailure(message);
    setPhase("failed");
  };

  const applyInvite = (text: string): boolean => {
    const inviteSdp = readPairingCode(text, "invite");
    if (!inviteSdp) {
      pushToast(
        "That is not a Quick Share code. On the sending device, choose Pair with a code.",
        "error",
      );
      return false;
    }
    setPhase("preparing");
    answerPairingInvite(inviteSdp, deviceName)
      .then((next) => {
        replyRef.current = next;
        if (!isMountedRef.current) {
          next.cancel();
          return;
        }
        setReply(next);
        setPhase("replying");
        const isCurrent = () =>
          isMountedRef.current && replyRef.current === next;
        next.connected
          .then((paired) => {
            if (!isCurrent()) {
              paired.link.close();
              return;
            }
            callbacksRef.current.onConnected(paired);
            pushToast(
              `Connected to ${paired.peerName}. Anything it sends shows up here.`,
            );
            callbacksRef.current.onClose();
          })
          .catch((error: unknown) => {
            if (!isCurrent()) return;
            fail(
              error instanceof Error
                ? error.message
                : "The devices could not reach each other.",
            );
          });
      })
      .catch(() =>
        fail(
          "That code could not be read. Make a new one on the sending device.",
        ),
      );
    return true;
  };

  const startAgain = () => {
    replyRef.current?.cancel();
    replyRef.current = null;
    setReply(null);
    setPhase("reading");
  };

  if (phase === "failed") {
    return (
      <div style={{ display: "grid", justifyItems: "center", gap: 14 }}>
        <StreamStatusLine tone="danger">{failure}</StreamStatusLine>
        <Button variant="primary" onClick={startAgain}>
          <RotateCcw size={14} />
          Start again
        </Button>
      </div>
    );
  }

  if (phase === "replying" && reply) {
    return (
      <PairingStep stepNumber={2} title="Show this reply to the sending device">
        <ShowCode
          value={reply.code}
          caption="On the sending device, scan or paste this to finish pairing."
        />
        <StreamStatusLine isBusy>
          Waiting for the sending device to read this
        </StreamStatusLine>
      </PairingStep>
    );
  }

  return (
    <PairingStep stepNumber={1} title="Read the sending device's code">
      {phase === "preparing" ? (
        <StreamStatusLine isBusy>Making a reply</StreamStatusLine>
      ) : (
        <ReadCode
          scanLabel="Point this camera at the code on the sending device."
          onCode={applyInvite}
        />
      )}
    </PairingStep>
  );
};
