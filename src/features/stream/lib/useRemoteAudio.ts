import { useCallback, useEffect, useState } from "react";

export interface RemoteAudio {
  /** The sender is actively sharing sound right now. */
  available: boolean;
  /** The operator has muted that sound locally. */
  muted: boolean;
  /** Mute or unmute the sender's audio for every sink pointed at this stream. */
  toggleMuted: () => void;
}

/**
 * Observes the audio on a received stream from the receiver's side, and lets the
 * operator mute it locally.
 *
 * `available` means the far end is sending sound *now*: the audio track exists
 * and the sender hasn't muted it. The track is negotiated with the connection and
 * arrives before any sound flows — a sender that toggles its mic off leaves the
 * track in place and flips it to muted — so we track its live mute/unmute rather
 * than its mere presence.
 *
 * Muting sets the track's `enabled` to false, which silences every sink pointed
 * at this stream at once: the in-app preview and the external projection window
 * share the track by reference, so one control mutes the room everywhere.
 */
export function useRemoteAudio(stream: MediaStream | null): RemoteAudio {
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

    // A track attached with addTrack() (how the receiver assembles the remote
    // stream) fires no `addtrack` event, so poll briefly until the negotiated
    // audio track appears, then stop — its mute/unmute events drive us after that.
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
}
