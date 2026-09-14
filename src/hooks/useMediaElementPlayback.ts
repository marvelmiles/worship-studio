import { useEffect, useImperativeHandle, useLayoutEffect, useRef } from "react";
import type { ForwardedRef, RefObject } from "react";
import type { MediaPlayback } from "../lib/presentChannel";

export interface MediaSurfaceHandle {
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (time: number) => void;
}

/** What a surface needs to know to play a clip or a sound inside its trim. */
export interface PlaybackWindowSettings {
  trimStart: number;
  trimEnd: number | null;
  loop: boolean;
  muted: boolean;
  /** 0 to 100, used while no operator playback is steering the level. */
  volume: number;
  playbackRate: number;
}

interface MediaElementPlaybackOptions {
  handleRef: ForwardedRef<MediaSurfaceHandle>;
  /** Changes when a different item is loaded, parking it at its trim start. */
  sourceKey: string;
  src: string | null;
  settings: PlaybackWindowSettings;
  /** Operator-driven playback; when omitted the element sits paused at its trim start. */
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

/**
 * Drives one `<video>` or `<audio>` element from a transport and a trim window:
 * the level, the mute, the speed, play and pause, the operator's seeks, and the
 * loop back to the trim start. Shared by every surface that plays a file, so a
 * trimmed clip and a trimmed sound keep to their windows the same way.
 */
export function useMediaElementPlayback<E extends HTMLMediaElement>({
  handleRef,
  sourceKey,
  src,
  settings,
  playback,
  forceMuted,
  onTimeUpdate,
  onEnded,
}: MediaElementPlaybackOptions): MediaElementBindings<E> {
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

  // A seek re-asserts the transport too: an element that stopped itself at the
  // end of its window starts again when the operator scrubs back into it.
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
    // Only a new token asks for a seek; the time alone moving is not one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekToken, src]);

  const restartLoop = (el: E) => {
    el.currentTime = settingsRef.current.trimStart;
    void el.play().catch(() => {});
  };

  // A file only reports its length once its headers are in, and a seek made
  // before then is dropped, so the trim start is claimed again here.
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
}
