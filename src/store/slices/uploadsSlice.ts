import { uid } from "../../lib/id";
import { afterWrite, blockWrite } from "../helpers";
import type { SliceCreator, StoreState } from "../storeTypes";

export type UploadKind = "background" | "audio" | "image" | "video";

export interface PendingUpload {
  token: string;
  kind: UploadKind;
  files: File[];
  savingIndex: number | null;
  savedCount: number;
  onComplete?: (ids: string[]) => void;
}

export interface UploadsSlice {
  pendingUpload: PendingUpload | null;
  cancelledUploadToken: string | null;

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

const discardSavedUploads = async (
  state: StoreState,
  kind: UploadKind,
  ids: string[],
): Promise<void> => {
  for (const id of ids) {
    if (!id) continue;
    if (kind === "background") await state.removeBackground(id);
    else if (kind === "audio") await state.removeAudio(id);
    else await state.removeMedia(id);
  }
};

export const createUploadsSlice: SliceCreator<UploadsSlice> = (set, get) => ({
  pendingUpload: null,
  cancelledUploadToken: null,

  beginUpload: (kind, files, onComplete) => {
    if (blockWrite(get)) return;
    if (files.length)
      set({
        cancelledUploadToken: null,
        pendingUpload: {
          token: uid(),
          kind,
          files,
          savingIndex: null,
          savedCount: 0,
          onComplete,
        },
      });
  },

  /* Cancelling closes the dialog at once. A commit already in flight finishes
     the file it is on, sees the cancelled token, and removes everything the
     batch had saved so nothing half-uploaded is left behind. */
  cancelUpload: () => {
    const pending = get().pendingUpload;
    if (!pending) return;
    if (pending.savingIndex === null) {
      set({ pendingUpload: null, cancelledUploadToken: null });
      return;
    }
    set({ pendingUpload: null, cancelledUploadToken: pending.token });
  },

  commitUpload: async (labels) => {
    const pending = get().pendingUpload;
    if (!pending) return;
    const { token, kind, files } = pending;
    const cancelled = () => get().cancelledUploadToken === token;
    const savedIds: string[] = [];

    for (let i = 0; i < files.length; i += 1) {
      if (cancelled()) break;
      set({
        pendingUpload: {
          ...pending,
          savingIndex: i,
          savedCount: savedIds.length,
        },
      });
      const file = files[i];
      const label = labels[i];
      let id: string;
      if (kind === "background") id = await get().uploadBackground(file, label);
      else if (kind === "audio") id = await get().uploadAudio(file, label);
      else id = await get().uploadMedia(kind, file, label);
      if (id) savedIds.push(id);
    }

    if (cancelled()) {
      set({ pendingUpload: null, cancelledUploadToken: null });
      await discardSavedUploads(get(), kind, savedIds);
      get().pushToast("Upload cancelled. Nothing was added.");
      return;
    }

    pending.onComplete?.(savedIds);
    set({ pendingUpload: null });
    afterWrite(get);
    const noun = UPLOAD_NOUNS[kind];
    get().pushToast(
      savedIds.length > 1
        ? `${savedIds.length} ${noun.many} added.`
        : `${noun.one} added.`,
    );
  },
});
