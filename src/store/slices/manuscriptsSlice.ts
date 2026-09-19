import type { Manuscript } from "../../types";
import { now } from "../../lib/id";
import { defaultManuscript } from "../../data/seed";
import { deleteRecord, saveRecord } from "../../lib/storage";
import { afterDelete, afterWrite, blockWrite } from "../helpers";
import type { SliceCreator } from "../storeTypes";

export {
  isUntitledManuscript,
  UNTITLED_MANUSCRIPT,
} from "../../lib/manuscript/newManuscript";

export interface ManuscriptsSlice {
  manuscripts: Manuscript[];

  upsertManuscript: (manuscript: Manuscript) => boolean;
  defaultManuscriptFor: (id: string) => Promise<Manuscript | null>;
  deleteManuscript: (id: string) => void;
}

export const createManuscriptsSlice: SliceCreator<ManuscriptsSlice> = (
  set,
  get,
) => ({
  manuscripts: [],

  upsertManuscript: (manuscript) => {
    if (blockWrite(get)) return false;
    set((state) => {
      const exists = state.manuscripts.some((m) => m.id === manuscript.id);
      const manuscripts = exists
        ? state.manuscripts.map((m) =>
            m.id === manuscript.id ? manuscript : m,
          )
        : [manuscript, ...state.manuscripts];
      return { manuscripts };
    });
    void saveRecord("manuscripts", manuscript);
    afterWrite(get);
    return true;
  },

  /**
   * A built-in manuscript the way it ships, keeping the dates and library marks
   * the stored copy carries so a reset only puts the content back.
   */
  defaultManuscriptFor: async (id) => {
    const stored = get().manuscripts.find((m) => m.id === id);
    if (!stored?.builtIn) return null;
    const shipped = await defaultManuscript(id);
    if (!shipped) return null;
    return {
      ...shipped,
      createdAt: stored.createdAt,
      updatedAt: now(),
      deleted: stored.deleted,
      pinned: stored.pinned,
      keepOnReset: stored.keepOnReset,
      mark: stored.mark,
    };
  },

  deleteManuscript: (id) => {
    const manuscript = get().manuscripts.find((m) => m.id === id);
    if (manuscript?.builtIn) return;
    set((state) => ({
      manuscripts: state.manuscripts.filter((m) => m.id !== id),
    }));
    void deleteRecord("manuscripts", id);
    afterDelete(get);
  },
});
