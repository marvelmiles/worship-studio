import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { CSSProperties } from "react";
import type { MediaItem, VideoSettings } from "../../types";
import type { MediaPlayback } from "../../lib/presentChannel";
import { buildFilter, videoSettingsOf } from "../../lib/media";
import { useBlobUrl } from "../../lib/blobUrls";

export interface VideoSurfaceHandle {
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (time: number) => void;
}

interface VideoSurfaceProps {
  item: MediaItem;
  /** Overrides the item's stored settings (used for live editor previews). */
  settings?: VideoSettings;
  /** Operator-driven playback; when omitted the video sits paused at its trim start. */
  playback?: MediaPlayback;
  /** Force-mute regardless of playback state (operator console while live). */
  forceMuted?: boolean;
  onTimeUpdate?: (time: number, duration: number) => void;
  onEnded?: () => void;
  style?: CSSProperties;
}

export const VideoSurface = forwardRef<VideoSurfaceHandle, VideoSurfaceProps>(
  function VideoSurface(
    { item, settings, playback, forceMuted, onTimeUpdate, onEnded, style },
    ref,
  ) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const src = useBlobUrl(item.id);
    const applied = settings ?? videoSettingsOf(item);
    const appliedRef = useRef(applied);
    appliedRef.current = applied;

    useImperativeHandle(ref, () => ({
      getCurrentTime: () => videoRef.current?.currentTime ?? 0,
      getDuration: () => videoRef.current?.duration ?? 0,
      seekTo: (time) => {
        if (videoRef.current) videoRef.current.currentTime = time;
      },
    }));

    useEffect(() => {
      const el = videoRef.current;
      if (!el) return;
      el.currentTime = applied.trimStart;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [item.id, src]);

    useEffect(() => {
      const el = videoRef.current;
      if (!el) return;
      el.playbackRate = applied.playbackRate;
    }, [applied.playbackRate, src]);

    useEffect(() => {
      const el = videoRef.current;
      if (!el) return;
      el.muted =
        forceMuted || applied.muted || Boolean(playback && playback.muted);
      const volume = playback ? playback.volume / 100 : applied.volume / 100;
      el.volume = Math.min(1, Math.max(0, volume));
    }, [applied.muted, applied.volume, playback, forceMuted, src]);

    useEffect(() => {
      const el = videoRef.current;
      if (!el || !playback) return;
      if (playback.playing) void el.play().catch(() => {});
      else el.pause();
    }, [playback?.playing, playback, item.id, src]);

    const seekToken = playback?.seekToken;
    useEffect(() => {
      const el = videoRef.current;
      if (!el || !playback || seekToken === undefined) return;
      el.currentTime = playback.seekTime;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [seekToken, src]);

    const handleTimeUpdate = () => {
      const el = videoRef.current;
      if (!el) return;
      const current = appliedRef.current;
      if (el.currentTime < current.trimStart - 0.5) {
        el.currentTime = current.trimStart;
      }
      if (current.trimEnd !== null && el.currentTime >= current.trimEnd) {
        if (current.loop) {
          el.currentTime = current.trimStart;
          void el.play().catch(() => {});
        } else {
          el.pause();
          onEnded?.();
        }
      }
      onTimeUpdate?.(el.currentTime, el.duration || 0);
    };

    const handleEnded = () => {
      const el = videoRef.current;
      if (!el) return;
      const current = appliedRef.current;
      if (current.loop) {
        el.currentTime = current.trimStart;
        void el.play().catch(() => {});
      } else {
        onEnded?.();
      }
    };

    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          display: "grid",
          placeItems: "center",
          background: "#000",
          ...style,
        }}
      >
        {src && (
          <video
            ref={videoRef}
            src={src}
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            style={{
              width: "100%",
              height: "100%",
              objectFit: applied.fit,
              filter: buildFilter(applied),
            }}
          />
        )}
      </div>
    );
  },
);
