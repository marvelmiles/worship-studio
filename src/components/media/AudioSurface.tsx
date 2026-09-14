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
  /** Overrides the sound's stored settings (used for live editor previews). */
  settings?: AudioSettings;
  /** Starts over at the trim start once the trim end or the file's end is reached. */
  loop: boolean;
  /** Operator-driven playback; when omitted the sound sits paused at its trim start. */
  playback?: MediaPlayback;
  onTimeUpdate?: (time: number, duration: number) => void;
  onEnded?: () => void;
}

/**
 * An invisible player for a library sound, kept inside the sound's trim window
 * the same way a clip is kept inside its own.
 */
export const AudioSurface = forwardRef<MediaSurfaceHandle, AudioSurfaceProps>(
  function AudioSurface(
    { item, settings, loop, playback, onTimeUpdate, onEnded },
    ref,
  ) {
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
