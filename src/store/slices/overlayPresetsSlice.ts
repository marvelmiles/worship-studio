import { now, uid } from "../../lib/id";
import { deleteRecord, saveRecord } from "../../lib/storage";
import {
  toSavedOverlay,
  type StreamOverlayPreset,
} from "../../features/stream/lib/overlayPresets";
import type { StreamOverlay } from "../../features/stream/lib/streamOverlay";
import { getStreamOverlays } from "../../features/stream/lib/streamOverlayStore";
import { releaseOverlayPassages } from "../../features/stream/lib/overlayPassage";
import { afterDelete, afterWrite, blockWrite } from "../helpers";
import type { SliceCreator } from "../storeTypes";

export interface OverlayPresetsSlice {
  overlayPresets: StreamOverlayPreset[];

  /** Keeps a broadcast overlay for later, and answers with its saved id. */
  saveOverlayPreset: (overlay: StreamOverlay, name: string) => string;
  /** Replaces what was saved with the overlay as it stands now. */
  updateOverlayPreset: (id: string, overlay: StreamOverlay) => void;
  renameOverlayPreset: (id: string, name: string) => void;
  removeOverlayPreset: (id: string) => void;
}

const byNewest = (presets: StreamOverlayPreset[]): StreamOverlayPreset[] =>
  [...presets].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

export const createOverlayPresetsSlice: SliceCreator<OverlayPresetsSlice> = (
  set,
  get,
) => ({
  overlayPresets: [],

  saveOverlayPreset: (overlay, name) => {
    if (blockWrite(get)) return "";
    const timestamp = now();
    const preset: StreamOverlayPreset = {
      id: uid(),
      name: name.trim(),
      overlay: toSavedOverlay(overlay),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    set((state) => ({
      overlayPresets: byNewest([...state.overlayPresets, preset]),
    }));
    void saveRecord("overlayPresets", preset);
    afterWrite(get);
    return preset.id;
  },

  updateOverlayPreset: (id, overlay) => {
    if (blockWrite(get)) return;
    const current = get().overlayPresets.find((preset) => preset.id === id);
    if (!current) return;
    const next: StreamOverlayPreset = {
      ...current,
      overlay: toSavedOverlay(overlay),
      updatedAt: now(),
    };
    set((state) => ({
      overlayPresets: byNewest(
        state.overlayPresets.map((preset) =>
          preset.id === id ? next : preset,
        ),
      ),
    }));
    void saveRecord("overlayPresets", next);
    afterWrite(get);
    /* The overlay it was saved from may have pointed at a different passage,
       and nothing else has to be holding the one it has just let go of. */
    releaseOverlayPassages([current.overlay], getStreamOverlays());
  },

  renameOverlayPreset: (id, name) => {
    if (blockWrite(get)) return;
    const current = get().overlayPresets.find((preset) => preset.id === id);
    const trimmed = name.trim();
    if (!current || !trimmed || trimmed === current.name) return;
    const next: StreamOverlayPreset = {
      ...current,
      name: trimmed,
      updatedAt: now(),
    };
    set((state) => ({
      overlayPresets: byNewest(
        state.overlayPresets.map((preset) =>
          preset.id === id ? next : preset,
        ),
      ),
    }));
    void saveRecord("overlayPresets", next);
    afterWrite(get);
  },

  removeOverlayPreset: (id) => {
    const removed = get().overlayPresets.find((preset) => preset.id === id);
    if (!removed) return;
    set((state) => ({
      overlayPresets: state.overlayPresets.filter((preset) => preset.id !== id),
    }));
    void deleteRecord("overlayPresets", id);
    releaseOverlayPassages([removed.overlay], getStreamOverlays());
    afterDelete(get);
  },
});
