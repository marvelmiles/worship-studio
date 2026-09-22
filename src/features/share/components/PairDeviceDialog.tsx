import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { useStore } from "../../../store/useStore";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { Spinner } from "../../../components/ui/Spinner";
import { ReadCode, ShowCode } from "../../stream/CodeExchange";
import { StreamStatusLine } from "../../stream/components/StreamStatusLine";
import { PairingStep } from "../../stream/receiver/PairingStep";
import { addPairedDevice } from "../lib/pairedShareDevices";
import {
  createPairingInvite,
  readPairingCode,
  type PairingInvite,
} from "../lib/sharePairing";
import type { ShareDevice } from "../lib/shareSignaling";

type Phase = "reading" | "connecting" | "failed";

interface PairDeviceDialogProps {
  open: boolean;
  deviceName: string;
  onClose: () => void;
  onPaired: (device: ShareDevice) => void;
}

/**
 * Pairs the sending device with another one by trading two codes, so the two
 * can share with no internet at all: only the same WiFi or hotspot.
 */
export const PairDeviceDialog = ({
  open,
  deviceName,
  onClose,
  onPaired,
}: PairDeviceDialogProps) => (
  <Modal open={open} onClose={onClose} title="Pair with a code" width={760}>
    {open && (
      <PairingSteps
        deviceName={deviceName}
        onClose={onClose}
        onPaired={onPaired}
      />
    )}
  </Modal>
);

const PairingSteps = ({
  deviceName,
  onClose,
  onPaired,
}: Omit<PairDeviceDialogProps, "open">) => {
  const pushToast = useStore((s) => s.pushToast);
  const [invite, setInvite] = useState<PairingInvite | null>(null);
  const [phase, setPhase] = useState<Phase>("reading");
  const [failure, setFailure] = useState("");
  const [attempt, setAttempt] = useState(0);
  const inviteRef = useRef<PairingInvite | null>(null);

  useEffect(() => {
    let isCancelled = false;
    let created: PairingInvite | null = null;

    createPairingInvite()
      .then((next) => {
        created = next;
        if (isCancelled) {
          next.cancel();
          return;
        }
        inviteRef.current = next;
        setInvite(next);
      })
      .catch(() => {
        if (isCancelled) return;
        setFailure("This device could not make a pairing code.");
        setPhase("failed");
      });

    return () => {
      isCancelled = true;
      inviteRef.current = null;
      created?.cancel();
    };
  }, [attempt]);

  const applyReply = (text: string): boolean => {
    if (!invite) return false;
    const replySdp = readPairingCode(text, "reply");
    if (!replySdp) {
      pushToast(
        "That is not a Quick Share reply. Scan the code the other device shows after it reads yours.",
        "error",
      );
      return false;
    }
    setPhase("connecting");
    const isCurrent = () => inviteRef.current === invite;
    invite
      .complete(replySdp, deviceName)
      .then((paired) => {
        if (!isCurrent()) {
          paired.link.close();
          return;
        }
        const device = addPairedDevice(paired);
        pushToast(`Paired with ${device.name}.`);
        onPaired(device);
        onClose();
      })
      .catch((error: unknown) => {
        if (!isCurrent()) return;
        setFailure(
          error instanceof Error
            ? error.message
            : "The pairing did not finish.",
        );
        setPhase("failed");
      });
    return true;
  };

  const startAgain = () => {
    setInvite(null);
    setPhase("reading");
    setAttempt((count) => count + 1);
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

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
        gap: 18,
        alignItems: "start",
      }}
    >
      <PairingStep stepNumber={1} title="Show this to the other device">
        {invite ? (
          <ShowCode
            value={invite.code}
            caption="On the other device, open Quick Share, choose Receive with a code, then scan or paste this."
          />
        ) : (
          <div style={{ padding: 30, display: "grid", placeItems: "center" }}>
            <Spinner size={22} />
          </div>
        )}
      </PairingStep>

      <PairingStep stepNumber={2} title="Then read its reply">
        {phase === "connecting" ? (
          <StreamStatusLine isBusy>
            Connecting to the other device
          </StreamStatusLine>
        ) : (
          <ReadCode
            scanLabel="Point this camera at the reply on the other device."
            onCode={applyReply}
          />
        )}
      </PairingStep>
    </div>
  );
};
