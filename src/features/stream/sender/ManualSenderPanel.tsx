import { useCallback, useEffect, useRef, useState } from "react";
import { Radio, RotateCcw } from "lucide-react";
import { useStore } from "../../../store/useStore";
import { Button } from "../../../components/ui/Button";
import { Spinner } from "../../../components/ui/Spinner";
import { StreamStatusBadge } from "../StreamStatusBadge";
import { ReadCode, ShowCode } from "../CodeExchange";
import { LobbyActions } from "../components/LobbyActions";
import { StreamCard, StreamCardTitle } from "../components/StreamCard";
import { StreamStatusLine } from "../components/StreamStatusLine";
import { openCamera } from "../lib/cameras";
import type { PeerStatus } from "../lib/peerStatus";
import { createSender, type SenderHandle } from "../lib/senderPeer";
import { decodeSignal, encodeSignal } from "../lib/streamSignal";
import {
  useConnectionLifecycle,
  type ConnectionPhase,
} from "../lib/useConnectionLifecycle";
import { connectionPhaseBadge } from "./senderBadge";
import { SharingCameraCard } from "./SharingCameraCard";
import { useSharingCamera } from "./useSharingCamera";

interface ManualSenderPanelProps {
  onBack: () => void;
  onReset: () => void;
  onUseOneTap?: () => void;
}

export const ManualSenderPanel = ({
  onBack,
  onReset,
  onUseOneTap,
}: ManualSenderPanelProps) => {
  const pushToast = useStore((s) => s.pushToast);
  const [isStreaming, setIsStreaming] = useState(false);
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState<PeerStatus>("idle");
  const [isViewerLive, setIsViewerLive] = useState(false);
  const senderRef = useRef<SenderHandle | null>(null);
  const getSender = useCallback(() => senderRef.current, []);
  const camera = useSharingCamera(getSender);
  const { stopCapture } = camera;

  const connectionPhase = useConnectionLifecycle(status, () => {
    pushToast("The other device disconnected.");
    onReset();
  });

  useEffect(
    () => () => {
      senderRef.current?.close();
      stopCapture();
    },
    [stopCapture],
  );

  const startStreaming = async (offerSdp: string) => {
    setIsStreaming(true);
    try {
      const stream = await openCamera();
      camera.attachStream(stream);
      const sender = await createSender({
        offerSdp,
        stream,
        onStatus: setStatus,
        onViewerLive: setIsViewerLive,
      });
      senderRef.current = sender;
      setReply(encodeSignal("answer", sender.reply));
    } catch {
      stopCapture();
      pushToast(
        "Couldn't open the camera. Allow camera access and try again.",
        "error",
      );
      setIsStreaming(false);
    }
  };

  const applyInvite = (text: string): boolean => {
    const parsed = decodeSignal(text);
    if (!parsed || parsed.kind !== "offer") {
      pushToast(
        "That doesn't look like an invite code from the other device.",
        "error",
      );
      return false;
    }
    void startStreaming(parsed.sdp);
    return true;
  };

  if (!isStreaming) {
    return (
      <div>
        <StreamCard style={{ maxWidth: 420, margin: "0 auto" }}>
          <StreamCardTitle
            centered
            title="Scan the other device's code"
            info="On the other device, open Stream and choose Show a camera here. Scan the code it shows, or paste it."
          />
          <ReadCode
            scanFacing="environment"
            scanLabel="Aim at the code on the other device's screen."
            onCode={applyInvite}
          />
        </StreamCard>
        <LobbyActions>
          {onUseOneTap && (
            <Button variant="ghost" size="sm" onClick={onUseOneTap}>
              <Radio size={14} />
              Quick connect
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onBack}>
            <RotateCcw size={14} />
            Back
          </Button>
        </LobbyActions>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
        gap: 22,
        alignItems: "start",
      }}
    >
      <StreamCard>
        <StreamCardTitle title="Show this reply to the other device" />
        {reply ? (
          <ShowCode
            value={reply}
            caption="On the other device, scan or paste this to finish connecting."
          />
        ) : (
          <div style={{ padding: 24, display: "grid", placeItems: "center" }}>
            <Spinner size={20} />
          </div>
        )}
      </StreamCard>

      <SharingCameraCard
        videoRef={camera.videoRef}
        badge={
          <StreamStatusBadge
            status={connectionPhaseBadge(connectionPhase, isViewerLive)}
            size="sm"
          />
        }
        statusLine={<PairedStatusLine phase={connectionPhase} />}
        isAudioOn={camera.isAudioOn}
        onToggleAudio={() => void camera.toggleAudio()}
        facing={camera.facing}
        hasMultipleCameras={camera.hasMultipleCameras}
        onFlip={() => void camera.flipCamera()}
        onStop={onBack}
      />
    </div>
  );
};

const PairedStatusLine = ({ phase }: { phase: ConnectionPhase }) => {
  switch (phase) {
    case "waiting":
      return (
        <StreamStatusLine isBusy>
          Waiting for the other device to scan your reply
        </StreamStatusLine>
      );
    case "reconnecting":
      return (
        <StreamStatusLine isBusy>
          Connection interrupted. Reconnecting
        </StreamStatusLine>
      );
    case "disconnected":
      return (
        <StreamStatusLine tone="danger">
          The other device disconnected. Starting over
        </StreamStatusLine>
      );
    default:
      return null;
  }
};
