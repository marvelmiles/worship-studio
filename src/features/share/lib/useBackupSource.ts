import { useMemo } from "react";
import { useStore } from "../../../store/useStore";
import type { BackupSource } from "../../../lib/backupPayload";

/**
 * The library as anything that sends it reads it. Each slice is taken on its
 * own so the snapshot only changes when its contents do.
 */
export const useBackupSource = (): BackupSource => {
  const manuscripts = useStore((state) => state.manuscripts);
  const scriptures = useStore((state) => state.scriptures);
  const media = useStore((state) => state.media);
  const themes = useStore((state) => state.themes);
  const backgrounds = useStore((state) => state.backgrounds);
  const audio = useStore((state) => state.audio);
  const overlayPresets = useStore((state) => state.overlayPresets);
  const prefs = useStore((state) => state.prefs);

  return useMemo(
    () => ({
      manuscripts,
      scriptures,
      media,
      themes,
      backgrounds,
      audio,
      overlayPresets,
      prefs,
    }),
    [
      audio,
      backgrounds,
      manuscripts,
      media,
      overlayPresets,
      prefs,
      scriptures,
      themes,
    ],
  );
};
