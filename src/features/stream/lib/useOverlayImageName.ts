import { useStore } from "../../../store/useStore";
import type { OverlayImageRef } from "./overlayAppearance";

/**
 * What to call the picture an overlay points at, for the controls.
 *
 * Null when nothing is chosen or the file has since been deleted, which the
 * settings read as "choose a picture" rather than showing a name for something
 * that is gone. Both libraries are searched, since a broadcast picture can come
 * from either (see OverlayPicture).
 */
export function useOverlayImageName(
  image: OverlayImageRef | null,
): string | null {
  const media = useStore((s) => s.media);
  const backgrounds = useStore((s) => s.backgrounds);
  if (!image) return null;
  const found =
    image.source === "background"
      ? backgrounds.find((entry) => entry.id === image.id)
      : media.find((entry) => entry.id === image.id);
  return found?.name ?? null;
}
