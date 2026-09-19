import { useMemo } from "react";
import type { CSSProperties } from "react";
import type { MediaItem, VideoSettings } from "../../types";
import type { MediaPlayback } from "../../lib/presentChannel";
import { backgroundVideoSettings } from "../../lib/media";
import { VideoSurface } from "./VideoSurface";

interface BackgroundVideoLayerProps {
  item: MediaItem;
  /** Settings for this one use, when the document or slide has its own. */
  settings?: VideoSettings | null;
  style?: CSSProperties;
}

export const BackgroundVideoLayer = ({
  item,
  settings: usage,
  style,
}: BackgroundVideoLayerProps) => {
  const settings = useMemo(
    () => ({
      ...(usage ?? backgroundVideoSettings(item)),
      loop: true,
      muted: true,
    }),
    [item, usage],
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
};
