import type { AudioItem, Background } from "../../types";
import { uid } from "../../lib/id";
import {
  deleteFileBlob,
  deleteFileWithThumb,
  isQuotaError,
  putFileBlob,
  thumbId,
} from "../../lib/fileStore";
import { invalidateBlobUrl } from "../../lib/blobUrls";
import { sDel, sPut, sPutStrict } from "../../lib/storage";
import { probeImageFile } from "../../lib/media";
import { afterDelete, afterWrite, blockWrite } from "../helpers";
import type { SliceCreator } from "../storeTypes";

export interface AssetsSlice {
  backgrounds: Background[];
  audio: AudioItem[];

  uploadBackground: (file: File, name?: string) => Promise<string>;
  addCustomBackground: (value: string, name?: string) => string;
  removeBackground: (id: string) => Promise<void>;
  uploadAudio: (file: File, name?: string) => Promise<string>;
  removeAudio: (id: string) => Promise<void>;
}

const QUOTA_TOAST =
  "Not enough storage space for that file — free up space and try again.";

export const createAssetsSlice: SliceCreator<AssetsSlice> = (set, get) => ({
  backgrounds: [],
  audio: [],

  uploadBackground: async (file, name) => {
    const id = uid();
    try {
      const probe = await probeImageFile(file);
      await putFileBlob(id, file);
      if (probe.thumbnail) await putFileBlob(thumbId(id), probe.thumbnail);
      const background: Background = {
        id,
        name: name?.trim() || file.name.replace(/\.[^.]+$/, ""),
        category: "Custom",
        type: "image",
        blobId: id,
        size: file.size,
        builtIn: false,
      };
      await sPutStrict("backgrounds", background);
      set((state) => ({ backgrounds: [...state.backgrounds, background] }));
      return id;
    } catch (err) {
      await deleteFileWithThumb(id).catch(() => {});
      get().pushToast(isQuotaError(err) ? QUOTA_TOAST : `Couldn't save "${file.name}".`, "error");
      afterWrite(get);
      return "";
    }
  },

  addCustomBackground: (value, name) => {
    if (blockWrite(get)) return "";
    const css = value.trim();
    const isGradient = /gradient\s*\(/i.test(css);
    const background: Background = {
      id: uid(),
      name: name?.trim() || (isGradient ? "Custom gradient" : css),
      category: "Custom",
      builtIn: false,
      ...(isGradient ? { type: "gradient" as const, css } : { type: "solid" as const, color: css }),
    };
    set((state) => ({ backgrounds: [...state.backgrounds, background] }));
    void sPut("backgrounds", background);
    afterWrite(get);
    return background.id;
  },

  removeBackground: async (id) => {
    const background = get().backgrounds.find((b) => b.id === id);
    if (!background || background.builtIn) return;
    set((state) => ({ backgrounds: state.backgrounds.filter((b) => b.id !== id) }));
    await sDel("backgrounds", id);
    const blobId = background.blobId;
    if (blobId) {
      const state = get();
      const stillUsed =
        state.media.some((m) => m.id === blobId) ||
        state.backgrounds.some((b) => b.blobId === blobId);
      if (!stillUsed) {
        invalidateBlobUrl(blobId);
        await deleteFileWithThumb(blobId);
      }
    }
    afterDelete(get);
  },

  uploadAudio: async (file, name) => {
    const id = uid();
    try {
      await putFileBlob(id, file);
      const item: AudioItem = {
        id,
        name: name?.trim() || file.name.replace(/\.[^.]+$/, ""),
        blobId: id,
        size: file.size,
        builtIn: false,
      };
      await sPutStrict("audio", item);
      set((state) => ({ audio: [...state.audio, item] }));
      return id;
    } catch (err) {
      await deleteFileBlob(id).catch(() => {});
      get().pushToast(isQuotaError(err) ? QUOTA_TOAST : `Couldn't save "${file.name}".`, "error");
      afterWrite(get);
      return "";
    }
  },

  removeAudio: async (id) => {
    const item = get().audio.find((a) => a.id === id);
    if (!item || item.builtIn) return;
    set((state) => ({ audio: state.audio.filter((a) => a.id !== id) }));
    await sDel("audio", id);
    if (item.blobId) {
      invalidateBlobUrl(item.blobId);
      await deleteFileBlob(item.blobId);
    }
    afterDelete(get);
  },
});
