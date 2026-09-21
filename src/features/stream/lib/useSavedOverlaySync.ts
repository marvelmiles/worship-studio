import { useEffect } from "react";
import { useStore } from "../../../store/useStore";
import { deepEqual } from "../../../lib/equality";
import { toSavedOverlay } from "./overlayPresets";
import type { StreamOverlay } from "./streamOverlay";

/* Sliders and drags change an overlay many times a second, so the saved copy
   is written once the changes settle rather than on every step. */
const SYNC_DELAY_MS = 500;

/** Keeps every saved overlay in step with the element it was saved from. */
export const useSavedOverlaySync = (
  overlays: readonly StreamOverlay[],
): void => {
  const presets = useStore((s) => s.overlayPresets);
  const updateOverlayPreset = useStore((s) => s.updateOverlayPreset);

  useEffect(() => {
    const drifted = overlays.filter((overlay) => {
      if (!overlay.presetId) return false;
      const preset = presets.find((entry) => entry.id === overlay.presetId);
      return (
        preset !== undefined &&
        !deepEqual(preset.overlay, toSavedOverlay(overlay))
      );
    });
    if (drifted.length === 0) return;

    const timer = window.setTimeout(() => {
      for (const overlay of drifted) {
        if (overlay.presetId) updateOverlayPreset(overlay.presetId, overlay);
      }
    }, SYNC_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [overlays, presets, updateOverlayPreset]);
};
