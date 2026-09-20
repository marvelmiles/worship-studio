import { useCallback, useRef, useState } from "react";
import { useStore } from "../../../store/useStore";
import { useScreenWakeLock } from "../../../hooks/useScreenWakeLock";
import { useBackgroundKeepAlive } from "../../../hooks/useBackgroundKeepAlive";
import { useResumePlaybackOnVisible } from "../../../hooks/useResumePlaybackOnVisible";
import {
  listCameras,
  openCameraFacing,
  reopenCamera,
  setStreamAudioEnabled,
  type FacingMode,
} from "../lib/cameras";
import type { SenderHandle } from "../lib/senderPeer";
import { useCameraRecovery } from "./useCameraRecovery";

const mergeAudioInto = (
  videoStream: MediaStream,
  audioSource: MediaStream | null,
): MediaStream =>
  new MediaStream([
    ...videoStream.getVideoTracks(),
    ...(audioSource?.getAudioTracks() ?? []),
  ]);

export const useSharingCamera = (getSender: () => SenderHandle | null) => {
  const pushToast = useStore((s) => s.pushToast);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [facing, setFacing] = useState<FacingMode>("environment");
  const [isAudioOn, setIsAudioOn] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  useScreenWakeLock(isCapturing);
  useBackgroundKeepAlive(isCapturing);
  useResumePlaybackOnVisible(videoRef);

  const showStream = useCallback((next: MediaStream) => {
    streamRef.current = next;
    setStream(next);
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = next;
    void video.play().catch(() => {});
  }, []);

  const switchToStream = useCallback(
    async (next: MediaStream) => {
      const sender = getSender();
      if (sender) {
        await sender.replaceVideo(next);
        showStream(sender.stream);
        return;
      }
      showStream(mergeAudioInto(next, streamRef.current));
    },
    [getSender, showStream],
  );

  const attachStream = useCallback(
    (next: MediaStream) => {
      showStream(next);
      setIsCapturing(true);
      void listCameras().then(setCameras);
    },
    [showStream],
  );

  const stopCapture = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
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
      const { stream: opened, switched } = await openCameraFacing(
        target,
        streamRef.current,
        cameras,
      );
      await switchToStream(opened);
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

  /* Recovery keeps trying for as long as the camera is refused, so the person
     is told once rather than on every attempt. */
  const hasWarnedRef = useRef(false);

  const reopen = useCallback(async () => {
    try {
      await switchToStream(await reopenCamera(facing));
      hasWarnedRef.current = false;
    } catch {
      if (hasWarnedRef.current) return;
      hasWarnedRef.current = true;
      pushToast(
        "Couldn't restart the camera. Tap Stop and share again.",
        "error",
      );
    }
  }, [facing, pushToast, switchToStream]);

  useCameraRecovery({ isCapturing, stream, reopen });

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
