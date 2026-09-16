import { useCallback, useEffect, useState } from "react";

export interface RemoteAudio {
  available: boolean;
  muted: boolean;
  toggleMuted: () => void;
}

export const useRemoteAudio = (stream: MediaStream | null): RemoteAudio => {
  const [available, setAvailable] = useState(false);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if (!stream) {
      setAvailable(false);
      setMuted(false);
      return;
    }

    const bound = new Set<MediaStreamTrack>();

    const sync = () => {
      const track = stream.getAudioTracks()[0] ?? null;
      setAvailable(
        Boolean(track && track.readyState === "live" && !track.muted),
      );
      setMuted(track ? !track.enabled : false);
    };

    const bindTracks = () => {
      for (const track of stream.getAudioTracks()) {
        if (bound.has(track)) continue;
        bound.add(track);
        track.addEventListener("mute", sync);
        track.addEventListener("unmute", sync);
        track.addEventListener("ended", sync);
      }
      sync();
    };

    bindTracks();

    const poll = window.setInterval(() => {
      bindTracks();
      if (bound.size > 0) window.clearInterval(poll);
    }, 300);
    const stopPoll = window.setTimeout(() => window.clearInterval(poll), 5000);

    return () => {
      window.clearInterval(poll);
      window.clearTimeout(stopPoll);
      for (const track of bound) {
        track.removeEventListener("mute", sync);
        track.removeEventListener("unmute", sync);
        track.removeEventListener("ended", sync);
      }
    };
  }, [stream]);

  const toggleMuted = useCallback(() => {
    const track = stream?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMuted(!track.enabled);
  }, [stream]);

  return { available, muted, toggleMuted };
};
