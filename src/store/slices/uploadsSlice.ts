import { afterWrite, blockWrite } from "../helpers";
import type { SliceCreator } from "../storeTypes";

export type UploadKind = "background" | "audio" | "image" | "video";

export interface PendingUpload {
  kind: UploadKind;
  files: File[];
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
    if (files.length) set({ pendingUpload: { kind, files, onComplete } });
  },

  cancelUpload: () => set({ pendingUpload: null }),

  commitUpload: async (labels) => {
    const pending = get().pendingUpload;
    if (!pending) return;
    const ids: string[] = [];
    for (let i = 0; i < pending.files.length; i += 1) {
      const file = pending.files[i];
      const label = labels[i];
      let id = "";
      if (pending.kind === "background")
        id = await get().uploadBackground(file, label);
      else if (pending.kind === "audio")
        id = await get().uploadAudio(file, label);
      else id = await get().uploadMedia(pending.kind, file, label);
      ids.push(id);
    }
    pending.onComplete?.(ids);
    set({ pendingUpload: null });
    afterWrite(get);
    const noun = UPLOAD_NOUNS[pending.kind];
    get().pushToast(
      ids.length > 1
        ? `${ids.length} ${noun.many} added.`
        : `${noun.one} added.`,
    );
  },
});
