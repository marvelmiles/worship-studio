import { useCallback, useRef, useState } from "react";
import type { RefObject } from "react";
import {
  DEFAULT_MEDIA_PLAYBACK,
  type MediaPlayback,
} from "../lib/presentChannel";
import type {
  MediaSurfaceHandle,
  PlaybackWindowSettings,
} from "./useMediaElementPlayback";

export type TrimWindow = Pick<PlaybackWindowSettings, "trimStart" | "trimEnd">;

export interface MediaPlaybackOptions {
  autoPlay?: boolean;
}

export interface AdoptedPlayback {
  playing: boolean;
  muted: boolean;
  volume: number;
  time: number;
}

export interface RestartOptions {
  playing?: boolean;
  time?: number;
}

export interface MediaPlaybackController {
  surfaceRef: RefObject<MediaSurfaceHandle>;
  getTime: () => number;
  playback: MediaPlayback;
  time: number;
  duration: number;
  togglePlaying: () => void;
  toggleMuted: () => void;
  setVolume: (volume: number) => void;
  seekTo: (time: number) => void;
  seekBy: (delta: number) => void;
  restart: (options?: RestartOptions) => void;
  adopt: (state: AdoptedPlayback) => void;
  reset: () => void;
  onTimeUpdate: (time: number, duration: number) => void;
  onEnded: () => void;
}

export const useMediaPlayback = (
  settings?: TrimWindow,
  { autoPlay = true }: MediaPlaybackOptions = {},
): MediaPlaybackController => {
  const surfaceRef = useRef<MediaSurfaceHandle>(null);
  const [playback, setPlayback] = useState<MediaPlayback>({
    ...DEFAULT_MEDIA_PLAYBACK,
    playing: autoPlay,
    seekTime: settings?.trimStart ?? 0,
  });
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
};
