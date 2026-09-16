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
import { probeAudioFile, probeImageFile } from "../../lib/media";
import { afterDelete, afterWrite, blockWrite } from "../helpers";
import type { SliceCreator } from "../storeTypes";

export interface AssetsSlice {
  backgrounds: Background[];
  audio: AudioItem[];

  uploadBackground: (file: File, name?: string) => Promise<string>;
  addCustomBackground: (value: string, name?: string) => string;
  updateBackground: (id: string, changes: Partial<Background>) => void;
  removeBackground: (id: string) => Promise<void>;
  attachVideoBackground: (mediaId: string) => string;
  uploadAudio: (file: File, name?: string) => Promise<string>;
  addVideoAudio: (mediaId: string) => string;
  updateAudio: (id: string, changes: Partial<AudioItem>) => boolean;
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

  attachVideoBackground: (mediaId) => {
    const attached = get().backgrounds.find(
      (b) => b.type === "video" && b.mediaId === mediaId,
    );
    if (attached) return attached.id;
    if (blockWrite(get)) return "";
    const item = get().media.find(
      (m) => m.id === mediaId && m.kind === "video",
    );
    if (!item) return "";
    const background: Background = {
      id: uid(),
      name: item.name,
      category: "Video",
      type: "video",
      mediaId: item.id,
      blobId: item.id,
      size: item.size,
      builtIn: false,
      createdAt: now(),
    };
    set((state) => ({ backgrounds: [...state.backgrounds, background] }));
    void saveRecord("backgrounds", background);
    afterWrite(get);
    return background.id;
  },

  uploadAudio: async (file, name) => {
    const id = uid();
    try {
      const { duration } = await probeAudioFile(file);
      await putFileBlob(id, file);
      const item: AudioItem = {
        id,
        name: name?.trim() || file.name.replace(/\.[^.]+$/, ""),
        blobId: id,
        size: file.size,
        duration,
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

  addVideoAudio: (mediaId) => {
    const added = get().audio.find((a) => a.mediaId === mediaId);
    if (added) return added.id;
    if (blockWrite(get)) return "";
    const item = get().media.find(
      (m) => m.id === mediaId && m.kind === "video",
    );
    if (!item) return "";
    const sound: AudioItem = {
      id: uid(),
      name: item.name,
      blobId: item.id,
      mediaId: item.id,
      size: item.size,
      duration: item.duration,
      builtIn: false,
      createdAt: now(),
    };
    set((state) => ({ audio: [...state.audio, sound] }));
    void saveRecord("audio", sound);
    afterWrite(get);
    return sound.id;
  },

  updateAudio: (id, changes) => {
    if (blockWrite(get)) return false;
    const current = get().audio.find((a) => a.id === id);
    if (!current || current.builtIn) return false;
    const next: AudioItem = { ...current, ...changes, id, updatedAt: now() };
    set((state) => ({
      audio: state.audio.map((a) => (a.id === id ? next : a)),
    }));
    void saveRecord("audio", next);
    afterWrite(get);
    return true;
  },

  removeAudio: async (id) => {
    const item = get().audio.find((a) => a.id === id);
    if (!item || item.builtIn) return;
    set((state) => ({ audio: state.audio.filter((a) => a.id !== id) }));
    await deleteRecord("audio", id);
    if (item.blobId && !item.mediaId) {
      invalidateBlobUrl(item.blobId);
      await deleteFileBlob(item.blobId);
    }
    afterDelete(get);
  },
});
