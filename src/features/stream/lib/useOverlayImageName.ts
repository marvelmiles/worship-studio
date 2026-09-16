import { useStore } from "../../../store/useStore";
import type { OverlayImageRef } from "./overlayAppearance";

export const useOverlayImageName = (
  image: OverlayImageRef | null,
): string | null => {
  const media = useStore((s) => s.media);
  const backgrounds = useStore((s) => s.backgrounds);
  if (!image) return null;
  const found =
    image.source === "background"
      ? backgrounds.find((entry) => entry.id === image.id)
      : media.find((entry) => entry.id === image.id);
  return found?.name ?? null;
};
