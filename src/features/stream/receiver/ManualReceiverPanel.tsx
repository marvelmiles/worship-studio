import { useEffect, useRef, useState } from "react";
import { MonitorSmartphone, RotateCcw } from "lucide-react";
import { useStore } from "../../../store/useStore";
import { Button } from "../../../components/ui/Button";
import { Spinner } from "../../../components/ui/Spinner";
import { ReadCode, ShowCode } from "../CodeExchange";
import { StreamStatusLine } from "../components/StreamStatusLine";
import type { PeerStatus } from "../lib/peerStatus";
import { createReceiver, type ReceiverHandle } from "../lib/receiverPeer";
import { decodeSignal, encodeSignal } from "../lib/streamSignal";
import {
  adoptStreamCamera,
  canJoinCamera,
  findCamera,
  MAX_STREAM_CAMERAS,
  updateStreamCamera,
  useStreamSession,
} from "../lib/streamSession";
import { PairedPanel } from "./PairedPanel";
import { PairingStep } from "./PairingStep";

const PAIRED_CAMERA_NAME = "Paired camera";

interface ManualReceiverPanelProps {
  onBack: () => void;
  onReset: () => void;
  onUseOneTap?: () => void;
}

export const ManualReceiverPanel = ({
  onBack,
  onReset,
  onUseOneTap,
}: ManualReceiverPanelProps) => {
  const pushToast = useStore((s) => s.pushToast);
  const session = useStreamSession();
  const [invite, setInvite] = useState("");
  const [status, setStatus] = useState<PeerStatus>("idle");
  const receiverRef = useRef<ReceiverHandle | null>(null);
  const statusRef = useRef<PeerStatus>("idle");
  const hasBeenLiveRef = useRef(false);
  const isAdoptedRef = useRef(false);
  const cameraId = useRef(`paired-${crypto.randomUUID()}`).current;
  const isPaired = Boolean(findCamera(session, cameraId));

  useEffect(() => {
    let isMounted = true;

    const reportToSession = (
      patch: Parameters<typeof updateStreamCamera>[1],
    ) => {
      if (isMounted && isAdoptedRef.current)
        updateStreamCamera(cameraId, patch);
    };

    // The first picture hands the connection to the app-wide session, so the stage and floating window can show it.
    const handleStream = (stream: MediaStream) => {
      if (!isMounted) return;
      if (isAdoptedRef.current) {
        updateStreamCamera(cameraId, { stream });
        return;
      }
      const receiver = receiverRef.current;
      if (!receiver) return;
      const isHandedOver = adoptStreamCamera({
        deviceId: cameraId,
        deviceName: PAIRED_CAMERA_NAME,
        handle: receiver,
        stream,
        status: statusRef.current,
      });
      if (isHandedOver) isAdoptedRef.current = true;
      else {
        pushToast(
          `Already holding ${MAX_STREAM_CAMERAS} cameras. Drop one first.`,
          "error",
        );
      }
    };

    createReceiver({
      onStream: handleStream,
      onStatus: (nextStatus) => {
        if (!isMounted) return;
        statusRef.current = nextStatus;
        setStatus(nextStatus);
        reportToSession({ status: nextStatus });
      },
      onAudioShared: (audioShared) => reportToSession({ audioShared }),
      onDeviceName: (deviceName) => reportToSession({ deviceName }),
    })
      .then((receiver) => {
        if (!isMounted) {
          receiver.close();
          return;
        }
        receiverRef.current = receiver;
        setInvite(encodeSignal("offer", receiver.invite));
      })
      .catch(() =>
        pushToast("Couldn't start the receiver on this device.", "error"),
      );

    return () => {
      isMounted = false;
      if (!isAdoptedRef.current) receiverRef.current?.close();
    };
  }, [cameraId, pushToast]);

  useEffect(() => {
    if (status === "live") hasBeenLiveRef.current = true;
    if (status === "failed" && hasBeenLiveRef.current) {
      hasBeenLiveRef.current = false;
      pushToast("The camera stopped sharing.", "error");
    }
  }, [status, pushToast]);

  useEffect(() => {
    if (isAdoptedRef.current && !isPaired) onReset();
  }, [isPaired, onReset]);

  const applyReply = (text: string): boolean => {
    const parsed = decodeSignal(text);
    if (!parsed || parsed.kind !== "answer") {
      pushToast(
        "That doesn't look like a reply code from the other device.",
        "error",
      );
      return false;
    }
    void receiverRef.current
      ?.accept(parsed.sdp)
      .catch(() => pushToast("Couldn't complete the connection.", "error"));
    return true;
  };

  if (isPaired) {
    return (
      <PairedPanel
        canPairAnother={canJoinCamera(session)}
        onPairAnother={onReset}
        onBack={onBack}
      />
    );
  }

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
          gap: 22,
          alignItems: "start",
        }}
      >
        <PairingStep stepNumber={1} title="Show this to the other device">
          {invite ? (
            <ShowCode
              value={invite}
              caption="On the other device: open Stream, choose Share this camera, then scan or paste this code."
            />
          ) : (
            <div style={{ padding: 30, display: "grid", placeItems: "center" }}>
              <Spinner size={22} />
            </div>
          )}
        </PairingStep>

        <PairingStep stepNumber={2} title="Then read its reply">
          <ReadCode
            scanFacing="user"
            scanLabel="Point the other device's reply code at this camera."
            onCode={applyReply}
          />
          <PairingStatusLine status={status} />
        </PairingStep>
      </div>

      <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
        {onUseOneTap && (
          <Button variant="ghost" size="sm" onClick={onUseOneTap}>
            <MonitorSmartphone size={14} />
            Quick connect
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onBack}>
          <RotateCcw size={14} />
          Back
        </Button>
      </div>
    </div>
  );
};

const PairingStatusLine = ({ status }: { status: PeerStatus }) => {
  if (status === "connecting") {
    return (
      <StreamStatusLine isBusy>Connecting to the other device</StreamStatusLine>
    );
  }
  if (status === "failed") {
    return (
      <StreamStatusLine tone="danger">
        Connection failed. Try the code again.
      </StreamStatusLine>
    );
  }
  return null;
};
