import { forwardRef } from "react";
import type { AudioItem, AudioSettings } from "../../types";
import type { MediaPlayback } from "../../lib/presentChannel";
import { audioSettingsOf } from "../../lib/media";
import { useAssetUrl } from "../../hooks/useAssetUrl";
import {
  useMediaElementPlayback,
  type MediaSurfaceHandle,
} from "../../hooks/useMediaElementPlayback";

interface AudioSurfaceProps {
  item: AudioItem;
  settings?: AudioSettings;
  loop: boolean;
  playback?: MediaPlayback;
  onTimeUpdate?: (time: number, duration: number) => void;
  onEnded?: () => void;
}

export const AudioSurface = forwardRef<MediaSurfaceHandle, AudioSurfaceProps>(
  ({ item, settings, loop, playback, onTimeUpdate, onEnded }, ref) => {
    const src = useAssetUrl(item);
    const applied = settings ?? audioSettingsOf(item);
    const element = useMediaElementPlayback<HTMLAudioElement>({
      handleRef: ref,
      sourceKey: item.id,
      src,
      settings: { ...applied, loop, muted: false, playbackRate: 1 },
      playback,
      onTimeUpdate,
      onEnded,
    });

    if (!src) return null;
    return (
      <audio
        ref={element.ref}
        src={src}
        preload="auto"
        onLoadedMetadata={element.onLoadedMetadata}
        onTimeUpdate={element.onTimeUpdate}
        onEnded={element.onEnded}
      />
    );
  },
);

AudioSurface.displayName = "AudioSurface";
