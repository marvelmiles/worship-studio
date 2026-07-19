import type { Background, MediaItem, MediaKind } from "../../types";
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
import {
  DEFAULT_IMAGE_SETTINGS,
  DEFAULT_VIDEO_SETTINGS,
  isAcceptedMediaFile,
  probeImageFile,
  probeVideoFile,
  type MediaProbe,
} from "../../lib/media";
import { afterDelete, afterWrite, blockWrite } from "../helpers";
import type { SliceCreator } from "../storeTypes";

export interface MediaSlice {
  media: MediaItem[];

  uploadMedia: (kind: MediaKind, file: File, name?: string) => Promise<string>;
  updateMedia: (id: string, changes: Partial<MediaItem>) => void;
  removeMedia: (id: string) => Promise<void>;
  useImageAsBackground: (id: string) => string;
}

const QUOTA_TOAST =
  "Not enough storage space for that file. Free up space and try again.";

export const createMediaSlice: SliceCreator<MediaSlice> = (set, get) => ({
  media: [],

  uploadMedia: async (kind, file, name) => {
    if (!isAcceptedMediaFile(kind, file)) {
      get().pushToast(`"${file.name}" isn't a supported ${kind} file.`, "error");
      return "";
    }
    const id = uid();
    try {
      let probe: MediaProbe = {};
      let thumbnail: Blob | null = null;
      if (kind === "video") {
        probe = await probeVideoFile(file);
      } else {
        const imageProbe = await probeImageFile(file);
        probe = imageProbe;
        thumbnail = imageProbe.thumbnail;
      }

      await putFileBlob(id, file);
      if (thumbnail) await putFileBlob(thumbId(id), thumbnail);

      const item: MediaItem = {
        id,
        kind,
        name: name?.trim() || file.name.replace(/\.[^.]+$/, ""),
        mimeType: file.type || undefined,
        size: file.size,
        duration: probe.duration,
        width: probe.width,
        height: probe.height,
        hasThumb: Boolean(thumbnail) || undefined,
        image: kind === "image" ? { ...DEFAULT_IMAGE_SETTINGS } : undefined,
        video: kind === "video" ? { ...DEFAULT_VIDEO_SETTINGS } : undefined,
        createdAt: now(),
        updatedAt: now(),
      };
      await saveRecordStrict("media", item);
      set((state) => ({ media: [item, ...state.media] }));
      return id;
    } catch (err) {
      await deleteFileWithThumb(id).catch(() => {});
      get().pushToast(
        isQuotaError(err) ? QUOTA_TOAST : `Couldn't save "${file.name}". ${String((err as Error)?.message || "")}`,
        "error"
      );
      afterWrite(get);
      return "";
    }
  },

  updateMedia: (id, changes) => {
    if (blockWrite(get)) return;
    const current = get().media.find((m) => m.id === id);
    if (!current) return;
    const next: MediaItem = { ...current, ...changes, id, updatedAt: now() };
    set((state) => ({ media: state.media.map((m) => (m.id === id ? next : m)) }));
    void saveRecord("media", next);
    afterWrite(get);
  },

  removeMedia: async (id) => {
    const backgroundsUseFile = get().backgrounds.some((b) => b.blobId === id);
    set((state) => ({ media: state.media.filter((m) => m.id !== id) }));
    await deleteRecord("media", id);
    if (backgroundsUseFile) {
      await deleteFileBlob(thumbId(id));
    } else {
      invalidateBlobUrl(id);
      await deleteFileWithThumb(id);
    }
    afterDelete(get);
  },

  useImageAsBackground: (id) => {
    if (blockWrite(get)) return "";
    const item = get().media.find((m) => m.id === id && m.kind === "image");
    if (!item) return "";
    // Shares the stored file instead of duplicating the bytes; deletion of
    // either owner keeps the blob alive while the other still references it.
    const background: Background = {
      id: uid(),
      name: item.name,
      category: "Custom",
      type: "image",
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
});
