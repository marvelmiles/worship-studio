import { forwardRef } from "react";
import type { CSSProperties } from "react";
import type { MediaItem, VideoSettings } from "../../types";
import type { MediaPlayback } from "../../lib/presentChannel";
import { buildFilter, videoSettingsOf } from "../../lib/media";
import { useBlobUrl } from "../../lib/blobUrls";
import {
  useMediaElementPlayback,
  type MediaSurfaceHandle,
} from "../../hooks/useMediaElementPlayback";

export type VideoSurfaceHandle = MediaSurfaceHandle;

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
    const src = useBlobUrl(item.id);
    const applied = settings ?? videoSettingsOf(item);
    const element = useMediaElementPlayback<HTMLVideoElement>({
      handleRef: ref,
      sourceKey: item.id,
      src,
      settings: applied,
      playback,
      forceMuted,
      onTimeUpdate,
      onEnded,
    });

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
            ref={element.ref}
            src={src}
            playsInline
            onLoadedMetadata={element.onLoadedMetadata}
            onTimeUpdate={element.onTimeUpdate}
            onEnded={element.onEnded}
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
