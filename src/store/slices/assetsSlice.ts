import type { AudioItem, Background } from "../../types";
import { now, uid } from "../../lib/id";
import {
  deleteFileBlob,
  deleteFileWithThumb,
  isQuotaError,
  putFileBlob,
  thumbId,
} from "../../lib/fileStore";
import { invalidateBlobUrl } from "../../lib/blobUrls";
import { deleteRecord, saveRecord, saveRecordStrict } from "../../lib/storage";
import { probeImageFile } from "../../lib/media";
import { afterDelete, afterWrite, blockWrite } from "../helpers";
import type { SliceCreator } from "../storeTypes";

export interface AssetsSlice {
  backgrounds: Background[];
  audio: AudioItem[];

  uploadBackground: (file: File, name?: string) => Promise<string>;
  addCustomBackground: (value: string, name?: string) => string;
  /** Library-level edit; documents already using the background keep their own copy. */
  updateBackground: (id: string, changes: Partial<Background>) => void;
  removeBackground: (id: string) => Promise<void>;
  uploadAudio: (file: File, name?: string) => Promise<string>;
  removeAudio: (id: string) => Promise<void>;
}

const QUOTA_TOAST =
  "Not enough storage space for that file. Free up space and try again.";

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
        createdAt: now(),
      };
      await saveRecordStrict("backgrounds", background);
      set((state) => ({ backgrounds: [...state.backgrounds, background] }));
      return id;
    } catch (err) {
      await deleteFileWithThumb(id).catch(() => {});
      get().pushToast(
        isQuotaError(err) ? QUOTA_TOAST : `Couldn't save "${file.name}".`,
        "error",
      );
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
      createdAt: now(),
      ...(isGradient
        ? { type: "gradient" as const, css }
        : { type: "solid" as const, color: css }),
    };
    set((state) => ({ backgrounds: [...state.backgrounds, background] }));
    void saveRecord("backgrounds", background);
    afterWrite(get);
    return background.id;
  },

  updateBackground: (id, changes) => {
    if (blockWrite(get)) return;
    const current = get().backgrounds.find((b) => b.id === id);
    if (!current || current.builtIn) return;
    const next: Background = { ...current, ...changes, id };
    set((state) => ({
      backgrounds: state.backgrounds.map((b) => (b.id === id ? next : b)),
    }));
    void saveRecord("backgrounds", next);
    afterWrite(get);
  },

  removeBackground: async (id) => {
    const background = get().backgrounds.find((b) => b.id === id);
    if (!background || background.builtIn) return;
    set((state) => ({
      backgrounds: state.backgrounds.filter((b) => b.id !== id),
    }));
    await deleteRecord("backgrounds", id);
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
        createdAt: now(),
      };
      await saveRecordStrict("audio", item);
      set((state) => ({ audio: [...state.audio, item] }));
      return id;
    } catch (err) {
      await deleteFileBlob(id).catch(() => {});
      get().pushToast(
        isQuotaError(err) ? QUOTA_TOAST : `Couldn't save "${file.name}".`,
        "error",
      );
      afterWrite(get);
      return "";
    }
  },

  removeAudio: async (id) => {
    const item = get().audio.find((a) => a.id === id);
    if (!item || item.builtIn) return;
    set((state) => ({ audio: state.audio.filter((a) => a.id !== id) }));
    await deleteRecord("audio", id);
    if (item.blobId) {
      invalidateBlobUrl(item.blobId);
      await deleteFileBlob(item.blobId);
    }
    afterDelete(get);
  },
});
