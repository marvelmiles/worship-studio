import { useEffect, useImperativeHandle, useLayoutEffect, useRef } from "react";
import type { ForwardedRef, RefObject } from "react";
import type { MediaPlayback } from "../lib/presentChannel";

export interface MediaSurfaceHandle {
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (time: number) => void;
}

export interface PlaybackWindowSettings {
  trimStart: number;
  trimEnd: number | null;
  loop: boolean;
  muted: boolean;
  volume: number;
  playbackRate: number;
}

interface MediaElementPlaybackOptions {
  handleRef: ForwardedRef<MediaSurfaceHandle>;
  sourceKey: string;
  src: string | null;
  settings: PlaybackWindowSettings;
  playback?: MediaPlayback;
  forceMuted?: boolean;
  onTimeUpdate?: (time: number, duration: number) => void;
  onEnded?: () => void;
}

export interface MediaElementBindings<E extends HTMLMediaElement> {
  ref: RefObject<E>;
  onLoadedMetadata: () => void;
  onTimeUpdate: () => void;
  onEnded: () => void;
}

export const useMediaElementPlayback = <E extends HTMLMediaElement>({
  handleRef,
  sourceKey,
  src,
  settings,
  playback,
  forceMuted,
  onTimeUpdate,
  onEnded,
}: MediaElementPlaybackOptions): MediaElementBindings<E> => {
  const elementRef = useRef<E>(null);
  const settingsRef = useRef(settings);
  useLayoutEffect(() => {
    settingsRef.current = settings;
  });

  useImperativeHandle(handleRef, () => ({
    getCurrentTime: () => elementRef.current?.currentTime ?? 0,
    getDuration: () => elementRef.current?.duration ?? 0,
    seekTo: (time) => {
      if (elementRef.current) elementRef.current.currentTime = time;
    },
  }));

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;
    el.currentTime = settingsRef.current.trimStart;
  }, [sourceKey, src]);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;
    el.playbackRate = settings.playbackRate;
  }, [settings.playbackRate, src]);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;
    el.muted =
      forceMuted || settings.muted || Boolean(playback && playback.muted);
    const volume = playback ? playback.volume / 100 : settings.volume / 100;
    el.volume = Math.min(1, Math.max(0, volume));
  }, [settings.muted, settings.volume, playback, forceMuted, src]);

  const playing = playback?.playing;
  const seekToken = playback?.seekToken;
  const seekTime = playback?.seekTime;

  useEffect(() => {
    const el = elementRef.current;
    if (!el || playing === undefined) return;
    if (playing) void el.play().catch(() => {});
    else el.pause();
  }, [playing, seekToken, sourceKey, src]);

  useEffect(() => {
    const el = elementRef.current;
    if (!el || seekToken === undefined || seekTime === undefined) return;
    el.currentTime = seekTime;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekToken, src]);

  const restartLoop = (el: E) => {
    el.currentTime = settingsRef.current.trimStart;
    void el.play().catch(() => {});
  };

  const handleLoadedMetadata = () => {
    const el = elementRef.current;
    if (!el) return;
    const { trimStart } = settingsRef.current;
    if (el.currentTime < trimStart) el.currentTime = trimStart;
    onTimeUpdate?.(el.currentTime, el.duration || 0);
  };

  const handleTimeUpdate = () => {
    const el = elementRef.current;
    if (!el) return;
    const current = settingsRef.current;
    if (el.currentTime < current.trimStart - 0.5) {
      el.currentTime = current.trimStart;
    }
    if (current.trimEnd !== null && el.currentTime >= current.trimEnd) {
      if (current.loop) {
        restartLoop(el);
      } else {
        el.pause();
        onEnded?.();
      }
    }
    onTimeUpdate?.(el.currentTime, el.duration || 0);
  };

  const handleEnded = () => {
    const el = elementRef.current;
    if (!el) return;
    if (settingsRef.current.loop) restartLoop(el);
    else onEnded?.();
  };

  return {
    ref: elementRef,
    onLoadedMetadata: handleLoadedMetadata,
    onTimeUpdate: handleTimeUpdate,
    onEnded: handleEnded,
  };
};
