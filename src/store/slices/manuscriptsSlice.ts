import type { LegacyManuscriptFields, Manuscript } from "../../types";
import { DEFAULT_COLLECTION } from "../../data/collections";
import { now, uid } from "../../lib/id";
import { parseManuscriptSlides } from "../../lib/parser";
import { deleteRecord, saveRecord } from "../../lib/storage";
import { afterDelete, afterWrite, blockWrite } from "../helpers";
import type { SliceCreator } from "../storeTypes";

export const UNTITLED_MANUSCRIPT = "Untitled Manuscript";

const LEGACY_UNTITLED = "Untitled Song";

/** True while a manuscript still carries the name it was created with. */
export const isUntitledManuscript = (title: string): boolean => {
  const trimmed = title.trim();
  return (
    !trimmed || trimmed === UNTITLED_MANUSCRIPT || trimmed === LEGACY_UNTITLED
  );
};

/**
 * Brings a stored record up to the current shape. Libraries written before the
 * songs module became manuscripts carry `lyrics`/`artist`/`category`; they are
 * read here once and carried over under the current names.
 */
export function normalizeStoredManuscript(
  record: Manuscript & LegacyManuscriptFields,
): Manuscript {
  const { lyrics, artist, category, ...rest } = record;
  return {
    ...rest,
    body: record.body ?? lyrics ?? "",
    author: record.author ?? artist,
    collection: record.collection ?? category ?? DEFAULT_COLLECTION,
  };
}

export interface ManuscriptsSlice {
  manuscripts: Manuscript[];

  /** False when storage is full and the write was refused. */
  upsertManuscript: (manuscript: Manuscript) => boolean;
  createManuscript: () => Manuscript | null;
  trashManuscript: (id: string) => void;
  restoreManuscript: (id: string) => void;
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

  trashManuscript: (id) => {
    const manuscript = get().manuscripts.find((m) => m.id === id);
    if (manuscript && !manuscript.builtIn)
      get().upsertManuscript({
        ...manuscript,
        deleted: true,
        // A trashed manuscript is out of the listing a pin orders, so it gives
        // its slot back rather than reclaiming one on restore.
        pinned: undefined,
        updatedAt: now(),
      });
  },
  restoreManuscript: (id) => {
    const manuscript = get().manuscripts.find((m) => m.id === id);
    if (manuscript)
      get().upsertManuscript({
        ...manuscript,
        deleted: false,
        updatedAt: now(),
      });
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
