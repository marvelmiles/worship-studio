import { useMemo } from "react";
import type { CSSProperties } from "react";
import type { MediaItem } from "../../types";
import type { MediaPlayback } from "../../lib/presentChannel";
import { videoSettingsOf } from "../../lib/media";
import { VideoSurface } from "./VideoSurface";

interface BackgroundVideoLayerProps {
  item: MediaItem;
  style?: CSSProperties;
}

/**
 * A clip playing behind the words: silent, looping inside its trim, and graded
 * the way it was tuned in the video editor. The room hears the background audio,
 * never the clip.
 */
export function BackgroundVideoLayer({
  item,
  style,
}: BackgroundVideoLayerProps) {
  const settings = useMemo(
    () => ({ ...videoSettingsOf(item), loop: true, muted: true }),
    [item],
  );
  const playback = useMemo<MediaPlayback>(
    () => ({
      playing: true,
      muted: true,
      volume: 0,
      seekTime: settings.trimStart,
      seekToken: 0,
    }),
    [settings.trimStart],
  );
  return (
    <VideoSurface
      item={item}
      settings={settings}
      playback={playback}
      style={style}
    />
  );
}
