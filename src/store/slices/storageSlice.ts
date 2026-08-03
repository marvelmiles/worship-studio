import {
  estimateQuota,
  saveRecord,
  storageState,
  wipeAllStores,
} from "../../lib/storage";
import {
  APP_RESERVE_IDB,
  bytesOf,
  computeStorageInfo,
} from "../../lib/storageStats";
import type { StorageInfo } from "../../lib/storageStats";
import { BACKGROUNDS } from "../../data/backgrounds";
import { THEMES } from "../../data/themes";
import { DEFAULT_AUDIO } from "../../data/sounds";
import { seedManuscripts } from "../../data/seed";
import type { SliceCreator } from "../storeTypes";

export interface StorageSlice {
  storage: StorageInfo | null;

  refreshStorage: () => Promise<StorageInfo | null>;
  freeUpStorage: () => Promise<void>;
  isMemoryFallback: () => boolean;
}

export const createStorageSlice: SliceCreator<StorageSlice> = (set, get) => ({
  storage: null,

  refreshStorage: async () => {
    const estimate = await estimateQuota();
    const state = get();
    // Binary payloads live in the "files" store as Blobs; their footprint is
    // the recorded file size, never a serialized copy.
    const fileBytes =
      state.media.reduce((n, m) => n + (m.size || 0), 0) +
      state.backgrounds.reduce(
        (n, b) => n + (b.blobId === b.id ? b.size || 0 : 0),
        0,
      ) +
      state.audio.reduce((n, a) => n + (a.size || 0), 0);
    const userUsed =
      fileBytes +
      bytesOf(state.manuscripts.filter((m) => !m.builtIn)) +
      bytesOf(state.scriptures) +
      bytesOf(state.media) +
      bytesOf(state.backgrounds.filter((b) => !b.builtIn)) +
      bytesOf(state.audio.filter((a) => !a.builtIn)) +
      bytesOf(state.themes.filter((t) => !t.builtIn));
    const backend = storageState.backend || "memory";
    const reserved =
      backend === "indexeddb"
        ? APP_RESERVE_IDB
        : bytesOf(state.manuscripts.filter((m) => m.builtIn)) +
          bytesOf(state.themes.filter((t) => t.builtIn)) +
          4096;
    const info = computeStorageInfo(estimate, userUsed, reserved, backend);
    set({ storage: info });
    return info;
  },

  freeUpStorage: async () => {
    await wipeAllStores();
    const manuscripts = seedManuscripts();
    for (const manuscript of manuscripts)
      await saveRecord("manuscripts", manuscript);
    for (const theme of THEMES) await saveRecord("themes", theme);
    await saveRecord("prefs", get().prefs);
    set({
      manuscripts,
      scriptures: [],
      media: [],
      themes: THEMES,
      backgrounds: BACKGROUNDS,
      audio: DEFAULT_AUDIO,
    });
    get().clearAlert("storage-block");
    get().clearAlert("storage-warn");
    await get().refreshStorage();
  },

  isMemoryFallback: () => storageState.memFallback,
});
