import type { Manuscript } from "../../types";
import { DEFAULT_COLLECTION } from "../../data/collections";
import { now, uid } from "../../lib/id";
import { parseManuscriptSlides } from "../../lib/parser";
import { deleteRecord, saveRecord } from "../../lib/storage";
import { afterDelete, afterWrite, blockWrite } from "../helpers";
import type { SliceCreator } from "../storeTypes";

export const UNTITLED_MANUSCRIPT = "Untitled Manuscript";

export const isUntitledManuscript = (title: string): boolean => {
  const trimmed = title.trim();
  return !trimmed || trimmed === UNTITLED_MANUSCRIPT;
};

export interface ManuscriptsSlice {
  manuscripts: Manuscript[];

  upsertManuscript: (manuscript: Manuscript) => boolean;
  createManuscript: () => Manuscript | null;
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

  createManuscript: () => {
    if (blockWrite(get)) return null;
    const body = "[verse]\nType your text here";
    const manuscript: Manuscript = {
      id: uid(),
      title: UNTITLED_MANUSCRIPT,
      author: "",
      collection: DEFAULT_COLLECTION,
      defaultThemeId: get().prefs.defaultManuscriptThemeId || "classic",
      defaultBackgroundId: "",
      defaultAudioId: null,
      body,
      maxLines: 6,
      autoPlay: undefined,
      slideDurationSeconds: undefined,
      createdAt: now(),
      updatedAt: now(),
      deleted: false,
      builtIn: false,
      style: {},
      slides: parseManuscriptSlides(body, { maxLines: 6 }),
    };
    get().upsertManuscript(manuscript);
    return manuscript;
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
