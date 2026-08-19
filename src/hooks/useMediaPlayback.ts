import { useCallback, useRef, useState } from "react";
import type { RefObject } from "react";
import type { VideoSettings } from "../types";
import {
  DEFAULT_MEDIA_PLAYBACK,
  type MediaPlayback,
} from "../lib/presentChannel";
import type { VideoSurfaceHandle } from "../components/media/VideoSurface";

export interface MediaPlaybackOptions {
  /** Where the clip is parked and whether it runs when a session begins. */
  autoPlay?: boolean;
}

/** Another surface's transport, taken on wholesale. */
export interface AdoptedPlayback {
  playing: boolean;
  muted: boolean;
  volume: number;
  /** Where that surface's clip has got to. */
  time: number;
}

export interface RestartOptions {
  playing?: boolean;
  /** Where to land, defaulting to the clip's trim start. */
  time?: number;
}

export interface MediaPlaybackController {
  /** Bind to the `VideoSurface` this controller drives. */
  surfaceRef: RefObject<VideoSurfaceHandle>;
  /** Where the clip is on the element itself, ahead of the next time update. */
  getTime: () => number;
  playback: MediaPlayback;
  time: number;
  duration: number;
  togglePlaying: () => void;
  toggleMuted: () => void;
  setVolume: (volume: number) => void;
  seekTo: (time: number) => void;
  /** Seeks relative to where the clip actually is, clamped to the trim window. */
  seekBy: (delta: number) => void;
  /** Back to the trim start and running, after a changed trim or a rewind. */
  restart: (options?: RestartOptions) => void;
  /**
   * Takes another surface's transport on: what it is doing, how it sounds and
   * where it has got to, in one step. Used to bring an editor's preview into
   * line with the clip the audience is already watching.
   */
  adopt: (state: AdoptedPlayback) => void;
  /** A different clip entirely: the whole transport starts over. */
  reset: () => void;
  onTimeUpdate: (time: number, duration: number) => void;
  onEnded: () => void;
}

/**
 * The transport a clip is driven by: playing, muted, volume and the seek the
 * surface should honour next.
 *
 * Held apart from any one surface so the same controls work on the projected
 * stage, in the floating presenter and in the media editor's preview, none of
 * which own the video element they are steering.
 */
export function useMediaPlayback(
  settings?: VideoSettings,
  { autoPlay = true }: MediaPlaybackOptions = {},
): MediaPlaybackController {
  const surfaceRef = useRef<VideoSurfaceHandle>(null);
  const [playback, setPlayback] = useState<MediaPlayback>({
    ...DEFAULT_MEDIA_PLAYBACK,
    playing: autoPlay,
    seekTime: settings?.trimStart ?? 0,
  });
  // The clip is parked at its trim start before a frame is decoded, so the
  // readout opens on the position the surface is about to take rather than on
  // wherever zero happens to be.
  const [time, setTime] = useState(settings?.trimStart ?? 0);
  const [duration, setDuration] = useState(0);

  const getTime = useCallback(
    () => surfaceRef.current?.getCurrentTime() ?? 0,
    [],
  );

  const togglePlaying = useCallback(
    () => setPlayback((state) => ({ ...state, playing: !state.playing })),
    [],
  );

  const toggleMuted = useCallback(
    () => setPlayback((state) => ({ ...state, muted: !state.muted })),
    [],
  );

  const setVolume = useCallback(
    (volume: number) =>
      setPlayback((state) => ({ ...state, volume, muted: false })),
    [],
  );

  const seekTo = useCallback((target: number) => {
    setPlayback((state) => ({
      ...state,
      seekTime: target,
      seekToken: state.seekToken + 1,
    }));
    setTime(target);
  }, []);

  const trimStart = settings?.trimStart ?? 0;
  const trimEnd = settings?.trimEnd ?? null;

  const seekBy = useCallback(
    (delta: number) => {
      const end = trimEnd ?? (duration || Infinity);
      const current = surfaceRef.current?.getCurrentTime() ?? time;
      seekTo(Math.max(trimStart, Math.min(end, current + delta)));
    },
    [seekTo, trimStart, trimEnd, duration, time],
  );

  const restart = useCallback(
    ({ playing = true, time: target = trimStart }: RestartOptions = {}) => {
      setTime(target);
      setPlayback((state) => ({
        ...state,
        playing,
        seekTime: target,
        seekToken: state.seekToken + 1,
      }));
    },
    [trimStart],
  );

  const adopt = useCallback((state: AdoptedPlayback) => {
    setTime(state.time);
    setPlayback((current) => ({
      playing: state.playing,
      muted: state.muted,
      volume: state.volume,
      seekTime: state.time,
      seekToken: current.seekToken + 1,
    }));
  }, []);

  const reset = useCallback(() => {
    setTime(trimStart);
    setDuration(0);
    setPlayback((state) => ({
      ...DEFAULT_MEDIA_PLAYBACK,
      playing: autoPlay,
      seekTime: trimStart,
      seekToken: state.seekToken + 1,
    }));
  }, [autoPlay, trimStart]);

  const onTimeUpdate = useCallback((next: number, nextDuration: number) => {
    setTime(next);
    if (nextDuration) setDuration(nextDuration);
  }, []);

  const onEnded = useCallback(
    () => setPlayback((state) => ({ ...state, playing: false })),
    [],
  );

  return {
    surfaceRef,
    getTime,
    playback,
    time,
    duration,
    togglePlaying,
    toggleMuted,
    setVolume,
    seekTo,
    seekBy,
    restart,
    adopt,
    reset,
    onTimeUpdate,
    onEnded,
  };
}
