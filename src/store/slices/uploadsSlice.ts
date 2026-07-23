import { afterWrite, blockWrite } from "../helpers";
import type { SliceCreator } from "../storeTypes";

export type UploadKind = "background" | "audio" | "image" | "video";

export interface PendingUpload {
  kind: UploadKind;
  files: File[];
  /** Index of the file currently saving, or null before saving starts. */
  savingIndex: number | null;
  /** How many files have finished saving. */
  savedCount: number;
  onComplete?: (ids: string[]) => void;
}

export interface UploadsSlice {
  pendingUpload: PendingUpload | null;

  beginUpload: (
    kind: UploadKind,
    files: File[],
    onComplete?: (ids: string[]) => void,
  ) => void;
  cancelUpload: () => void;
  commitUpload: (labels: string[]) => Promise<void>;
}

const UPLOAD_NOUNS: Record<UploadKind, { one: string; many: string }> = {
  background: { one: "Background", many: "backgrounds" },
  audio: { one: "Sound", many: "sounds" },
  image: { one: "Image", many: "images" },
  video: { one: "Video", many: "videos" },
};

export const createUploadsSlice: SliceCreator<UploadsSlice> = (set, get) => ({
  pendingUpload: null,

  beginUpload: (kind, files, onComplete) => {
    if (blockWrite(get)) return;
    if (files.length)
      set({
        pendingUpload: {
          kind,
          files,
          savingIndex: null,
          savedCount: 0,
          onComplete,
        },
      });
  },

  cancelUpload: () => set({ pendingUpload: null }),

  commitUpload: async (labels) => {
    const pending = get().pendingUpload;
    if (!pending) return;
    const savedIds: string[] = [];
    for (let i = 0; i < pending.files.length; i += 1) {
      set({
        pendingUpload: {
          ...pending,
          savingIndex: i,
          savedCount: savedIds.length,
        },
      });
      const file = pending.files[i];
      const label = labels[i];
      let id: string;
      if (pending.kind === "background")
        id = await get().uploadBackground(file, label);
      else if (pending.kind === "audio")
        id = await get().uploadAudio(file, label);
      else id = await get().uploadMedia(pending.kind, file, label);
      savedIds.push(id);
    }
    pending.onComplete?.(savedIds);
    set({ pendingUpload: null });
    afterWrite(get);
    const noun = UPLOAD_NOUNS[pending.kind];
    get().pushToast(
      savedIds.length > 1
        ? `${savedIds.length} ${noun.many} added.`
        : `${noun.one} added.`,
    );
  },
});
