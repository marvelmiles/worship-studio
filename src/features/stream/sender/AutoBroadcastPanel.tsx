import { useCallback, useEffect, useRef, useState } from "react";
import { KeyRound } from "lucide-react";
import { useStore } from "../../../store/useStore";
import { Button } from "../../../components/ui/Button";
import { InfoTip } from "../../../components/ui/InfoTip";
import { StreamStatusBadge } from "../StreamStatusBadge";
import { LobbyActions } from "../components/LobbyActions";
import { QuickConnectNote } from "../components/QuickConnectNote";
import { StreamStatusLine } from "../components/StreamStatusLine";
import { openCamera } from "../lib/cameras";
import { detectDeviceName } from "../lib/deviceName";
import { deriveNetworkRoom } from "../lib/room";
import { createSender, type SenderHandle } from "../lib/senderPeer";
import { publishBroadcaster, type BroadcastHandle } from "../lib/signaling";
import { broadcastPhaseBadge, type BroadcastPhase } from "./senderBadge";
import { SharingCameraCard } from "./SharingCameraCard";
import { useSharingCamera } from "./useSharingCamera";

const RECONNECT_GRACE_MS = 3 * 60 * 1000;

interface AutoBroadcastPanelProps {
  onBack: () => void;
  onReset: () => void;
  onUseCode: () => void;
}

export const AutoBroadcastPanel = ({
  onBack,
  onReset,
  onUseCode,
}: AutoBroadcastPanelProps) => {
  const pushToast = useStore((s) => s.pushToast);
  const [phase, setPhase] = useState<BroadcastPhase>("starting");
  const [isViewerLive, setIsViewerLive] = useState(false);
  const broadcastRef = useRef<BroadcastHandle | null>(null);
  const senderRef = useRef<SenderHandle | null>(null);
  const getSender = useCallback(() => senderRef.current, []);
  const camera = useSharingCamera(getSender);
  const { attachStream, stopCapture, streamRef } = camera;

  useEffect(() => {
    let isCancelled = false;

    const answerOffer = async (
      broadcast: BroadcastHandle,
      offerSdp: string,
    ) => {
      const existingSender = senderRef.current;
      if (existingSender) {
        const answerSdp = await existingSender.answerRestartOffer(offerSdp);
        if (!isCancelled) await broadcast.sendAnswer(answerSdp);
        return;
      }
      const stream = streamRef.current;
      if (!stream) return;
      setPhase("connecting");
      const sender = await createSender({
        offerSdp,
        stream,
        onStatus: (status) => {
          if (isCancelled) return;
          if (
            status === "live" ||
            status === "reconnecting" ||
            status === "failed"
          ) {
            setPhase(status);
          }
        },
        onViewerLive: (live) => {
          if (!isCancelled) setIsViewerLive(live);
        },
      });
      senderRef.current = sender;
      await broadcast.sendAnswer(sender.reply);
    };

    const startBroadcast = async () => {
      const room = await deriveNetworkRoom();
      if (isCancelled) return;
      if (!room) {
        pushToast(
          "Couldn't detect your network for one-tap. Use a code instead.",
          "error",
        );
        onUseCode();
        return;
      }

      let stream: MediaStream;
      try {
        stream = await openCamera();
      } catch {
        if (isCancelled) return;
        pushToast(
          "Couldn't open the camera. Allow camera access and try again.",
          "error",
        );
        onBack();
        return;
      }
      if (isCancelled) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      attachStream(stream);

      const deviceName = await detectDeviceName();
      if (isCancelled) return;
      let broadcast: BroadcastHandle;
      try {
        broadcast = publishBroadcaster(room, deviceName);
      } catch {
        onUseCode();
        return;
      }
      broadcastRef.current = broadcast;
      setPhase("waiting");

      let offerQueue = Promise.resolve();
      let lastOfferSdp = "";
      broadcast.onOffer((offerSdp) => {
        if (offerSdp === lastOfferSdp) return;
        lastOfferSdp = offerSdp;
        offerQueue = offerQueue
          .then(() => answerOffer(broadcast, offerSdp))
          .catch(() => {
            if (!isCancelled && !senderRef.current) setPhase("failed");
          });
      });
    };

    void startBroadcast();

    return () => {
      isCancelled = true;
      void broadcastRef.current?.close();
      senderRef.current?.close();
      stopCapture();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase === "live") void broadcastRef.current?.clearCall();
  }, [phase]);

  // A failed link waits for the viewer's ICE restart while the device wakes; only a long silence resets the lobby.
  useEffect(() => {
    if (phase !== "failed") return;
    const graceMs = senderRef.current ? RECONNECT_GRACE_MS : 0;
    const timer = window.setTimeout(() => {
      pushToast(
        "The viewing device disconnected. Waiting for a new connection.",
      );
      onReset();
    }, graceMs);
    return () => window.clearTimeout(timer);
  }, [phase, pushToast, onReset]);

  return (
    <div style={{ maxWidth: 460, margin: "0 auto" }}>
      <SharingCameraCard
        videoRef={camera.videoRef}
        badge={
          <StreamStatusBadge
            status={broadcastPhaseBadge(phase, isViewerLive)}
            size="sm"
          />
        }
        statusLine={
          <BroadcastStatusLine phase={phase} isViewerLive={isViewerLive} />
        }
        isAudioOn={camera.isAudioOn}
        onToggleAudio={() => void camera.toggleAudio()}
        facing={camera.facing}
        hasMultipleCameras={camera.hasMultipleCameras}
        onFlip={() => void camera.flipCamera()}
        onStop={onBack}
      />
      <QuickConnectNote />
      <LobbyActions>
        <Button variant="ghost" size="sm" onClick={onUseCode}>
          <KeyRound size={14} />
          Pair with a code instead
        </Button>
      </LobbyActions>
    </div>
  );
};

const BroadcastStatusLine = ({
  phase,
  isViewerLive,
}: {
  phase: BroadcastPhase;
  isViewerLive: boolean;
}) => {
  switch (phase) {
    case "starting":
      return (
        <StreamStatusLine isBusy>Getting your camera ready</StreamStatusLine>
      );
    case "waiting":
      return (
        <StreamStatusLine isBusy>
          Waiting for another device
          <InfoTip title="Waiting for a device">
            On the other device, open Stream and choose Show a camera here. It
            picks this camera from there.
          </InfoTip>
        </StreamStatusLine>
      );
    case "connecting":
      return <StreamStatusLine isBusy>Connecting</StreamStatusLine>;
    case "reconnecting":
    case "failed":
      return (
        <StreamStatusLine isBusy>
          Connection interrupted. Reconnecting
        </StreamStatusLine>
      );
    default:
      return (
        <StreamStatusLine>
          {isViewerLive
            ? "You're live on the other device's display."
            : "You're connected. The other device is showing this camera."}
        </StreamStatusLine>
      );
  }
};
