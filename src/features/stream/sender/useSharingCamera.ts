import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "../../../store/useStore";
import { useScreenWakeLock } from "../../../hooks/useScreenWakeLock";
import { useResumePlaybackOnVisible } from "../../../hooks/useResumePlaybackOnVisible";
import {
  listCameras,
  openCameraFacing,
  reopenCamera,
  setStreamAudioEnabled,
  type FacingMode,
} from "../lib/cameras";
import type { SenderHandle } from "../lib/senderPeer";

const mergeAudioInto = (
  videoStream: MediaStream,
  audioSource: MediaStream | null,
): MediaStream =>
  new MediaStream([
    ...videoStream.getVideoTracks(),
    ...(audioSource?.getAudioTracks() ?? []),
  ]);

const hasLiveVideoTrack = (stream: MediaStream | null): boolean =>
  stream?.getVideoTracks().some((track) => track.readyState === "live") ??
  false;

export const useSharingCamera = (getSender: () => SenderHandle | null) => {
  const pushToast = useStore((s) => s.pushToast);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isRecoveringRef = useRef(false);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [facing, setFacing] = useState<FacingMode>("environment");
  const [isAudioOn, setIsAudioOn] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  useScreenWakeLock(isCapturing);
  useResumePlaybackOnVisible(videoRef);

  const showStream = useCallback((stream: MediaStream) => {
    streamRef.current = stream;
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, []);

  const switchToStream = useCallback(
    async (stream: MediaStream) => {
      const sender = getSender();
      if (sender) {
        await sender.replaceVideo(stream);
        showStream(sender.stream);
        return;
      }
      showStream(mergeAudioInto(stream, streamRef.current));
    },
    [getSender, showStream],
  );

  const attachStream = useCallback(
    (stream: MediaStream) => {
      showStream(stream);
      setIsCapturing(true);
      void listCameras().then(setCameras);
    },
    [showStream],
  );

  const stopCapture = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setIsCapturing(false);
  }, []);

  const flipCamera = useCallback(async () => {
    if (cameras.length < 2) {
      pushToast("This device only has one camera.", "error");
      return;
    }
    const target: FacingMode =
      facing === "environment" ? "user" : "environment";
    try {
      const { stream, switched } = await openCameraFacing(
        target,
        streamRef.current,
        cameras,
      );
      await switchToStream(stream);
      if (switched) setFacing(target);
      else
        pushToast("This device wouldn't switch to the other camera.", "error");
    } catch {
      pushToast("Couldn't switch cameras.", "error");
    }
  }, [cameras, facing, pushToast, switchToStream]);

  const toggleAudio = useCallback(async () => {
    const next = !isAudioOn;
    try {
      const sender = getSender();
      if (sender) await sender.setAudioEnabled(next);
      else if (streamRef.current) {
        await setStreamAudioEnabled(streamRef.current, next);
      }
      setIsAudioOn(next);
    } catch {
      pushToast(
        "Couldn't use the microphone. Allow mic access and try again.",
        "error",
      );
    }
  }, [getSender, isAudioOn, pushToast]);

  // The OS can end camera capture while the phone sleeps; reopen it on return so the live link carries video again.
  useEffect(() => {
    if (!isCapturing) return;

    const recoverCamera = async () => {
      if (document.visibilityState !== "visible" || isRecoveringRef.current) {
        return;
      }
      if (hasLiveVideoTrack(streamRef.current)) return;
      isRecoveringRef.current = true;
      try {
        await switchToStream(await reopenCamera(facing));
      } catch {
        pushToast(
          "Couldn't restart the camera. Tap Stop and share again.",
          "error",
        );
      } finally {
        isRecoveringRef.current = false;
      }
    };

    const handleRecovery = () => void recoverCamera();
    document.addEventListener("visibilitychange", handleRecovery);
    const videoTrack = streamRef.current?.getVideoTracks()[0];
    videoTrack?.addEventListener("ended", handleRecovery);
    return () => {
      document.removeEventListener("visibilitychange", handleRecovery);
      videoTrack?.removeEventListener("ended", handleRecovery);
    };
  }, [facing, isCapturing, pushToast, switchToStream]);

  return {
    videoRef,
    streamRef,
    facing,
    hasMultipleCameras: cameras.length > 1,
    isAudioOn,
    attachStream,
    stopCapture,
    flipCamera,
    toggleAudio,
  };
};
