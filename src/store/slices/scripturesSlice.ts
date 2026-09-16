import type {
  BibleVerse,
  BibleVersionId,
  PassageRange,
  ScripturePassage,
} from "../../types";
import { now, uid } from "../../lib/id";
import { SCRIPTURE_PASSAGE_FONT_SIZE } from "../../data/themes";
import { deleteRecord, saveRecord } from "../../lib/storage";
import { buildScriptureSlides } from "../../features/bible/lib/scriptureSlides";
import { formatReference } from "../../features/bible/lib/reference";
import { afterDelete, afterWrite, blockWrite } from "../helpers";
import type { PresentationMode } from "./presentSlice";
import type { SliceCreator } from "../storeTypes";

export const QUICK_PASSAGE_ID = "scripture-quick-present";
export const SCRIPTURE_THEME_ID = "scripture";

export interface ScriptureSelection {
  version: BibleVersionId;
  range: PassageRange;
  verses: BibleVerse[];
}

export interface SavePassageOptions extends ScriptureSelection {
  versesPerSlide?: number;
  showVerseNumbers?: boolean;
  showReference?: boolean;
  title?: string;
  splitLongVerses?: boolean;
}

export interface StageSelectionOptions {
  id?: string;
  splitLongVerses?: boolean;
}

export interface ScripturesSlice {
  scriptures: ScripturePassage[];

  upsertScripture: (passage: ScripturePassage) => boolean;
  saveScripturePassage: (
    options: SavePassageOptions,
  ) => ScripturePassage | null;
  overwriteScripturePassage: (
    id: string,
    options: SavePassageOptions,
  ) => ScripturePassage | null;
  rebuildScriptureSlides: (
    id: string,
    changes?: Partial<ScripturePassage>,
  ) => void;
  trashScripture: (id: string) => void;
  restoreScripture: (id: string) => void;
  deleteScripture: (id: string) => void;
  presentScriptureSelection: (
    selection: ScriptureSelection,
    mode?: PresentationMode,
  ) => void;
  stageScriptureSelection: (
    selection: ScriptureSelection,
    options?: StageSelectionOptions,
  ) => ScripturePassage | null;
}

const buildPassage = (
  options: SavePassageOptions,
  id: string,
  quick: boolean,
  themeId: string = SCRIPTURE_THEME_ID,
): ScripturePassage => {
  const versesPerSlide = options.versesPerSlide ?? 1;
  const showVerseNumbers = options.showVerseNumbers ?? true;
  const showReference = options.showReference ?? true;
  return {
    id,
    title: options.title ?? formatReference(options.range, options.version),
    version: options.version,
    range: options.range,
    verses: options.verses,
    versesPerSlide,
    showVerseNumbers,
    showReference,
    quick: quick || undefined,
    slides: buildScriptureSlides({
      version: options.version,
      range: options.range,
      verses: options.verses,
      versesPerSlide,
      showVerseNumbers,
      showReference,
      splitLongVerses: options.splitLongVerses ?? quick,
    }),
    defaultThemeId: themeId,
    defaultBackgroundId: "",
    defaultAudioId: null,
    style: { fontSize: SCRIPTURE_PASSAGE_FONT_SIZE },
    createdAt: now(),
    updatedAt: now(),
    deleted: false,
    builtIn: false,
  };
};

export const createScripturesSlice: SliceCreator<ScripturesSlice> = (
  set,
  get,
) => ({
  scriptures: [],

  upsertScripture: (passage) => {
    if (blockWrite(get)) return false;
    set((state) => {
      const exists = state.scriptures.some((s) => s.id === passage.id);
      const scriptures = exists
        ? state.scriptures.map((s) => (s.id === passage.id ? passage : s))
        : [passage, ...state.scriptures];
      return { scriptures };
    });
    void saveRecord("scriptures", passage);
    afterWrite(get);
    return true;
  },

  saveScripturePassage: (options) => {
    if (blockWrite(get)) return null;
    const passage = buildPassage(options, uid(), false, scriptureThemeId(get));
    get().upsertScripture(passage);
    return passage;
  },

  overwriteScripturePassage: (id, options) => {
    if (blockWrite(get)) return null;
    const current = get().scriptures.find((s) => s.id === id);
    if (!current) return null;
    const versesPerSlide = options.versesPerSlide ?? 1;
    const showVerseNumbers = options.showVerseNumbers ?? true;
    const showReference = options.showReference ?? true;
    const next: ScripturePassage = {
      ...current,
      version: options.version,
      range: options.range,
      verses: options.verses,
      versesPerSlide,
      showVerseNumbers,
      showReference,
      slides: buildScriptureSlides({
        version: options.version,
        range: options.range,
        verses: options.verses,
        versesPerSlide,
        showVerseNumbers,
        showReference,
        splitLongVerses: Boolean(current.quick),
      }),
      updatedAt: now(),
    };
    get().upsertScripture(next);
    return next;
  },

  rebuildScriptureSlides: (id, changes = {}) => {
    const current = get().scriptures.find((s) => s.id === id);
    if (!current) return;
    const next: ScripturePassage = { ...current, ...changes, updatedAt: now() };
    next.style = {
      fontSize: SCRIPTURE_PASSAGE_FONT_SIZE,
      ...next.style,
    };
    next.slides = buildScriptureSlides({
      version: next.version,
      range: next.range,
      verses: next.verses,
      versesPerSlide: next.versesPerSlide,
      showVerseNumbers: next.showVerseNumbers,
      showReference: next.showReference,
      splitLongVerses: Boolean(next.quick),
    });
    next.title = formatReference(next.range, next.version);
    get().upsertScripture(next);
  },

  trashScripture: (id) => {
    const passage = get().scriptures.find((s) => s.id === id);
    if (passage)
      get().upsertScripture({
        ...passage,
        deleted: true,
        pinned: undefined,
        updatedAt: now(),
      });
  },
  restoreScripture: (id) => {
    const passage = get().scriptures.find((s) => s.id === id);
    if (passage)
      get().upsertScripture({ ...passage, deleted: false, updatedAt: now() });
  },
  deleteScripture: (id) => {
    set((state) => ({
      scriptures: state.scriptures.filter((s) => s.id !== id),
    }));
    void deleteRecord("scriptures", id);
    afterDelete(get);
  },

  presentScriptureSelection: (selection, mode = "stage") => {
    if (blockWrite(get)) return;
    const passage = buildPassage(
      { ...selection, showVerseNumbers: false },
      QUICK_PASSAGE_ID,
      true,
      scriptureThemeId(get),
    );
    get().upsertScripture(passage);
    get().startPresent("scripture", passage.id, 0, mode);
  },

  stageScriptureSelection: (selection, options = {}) => {
    if (blockWrite(get)) return null;
    const passage = buildPassage(
      {
        ...selection,
        showVerseNumbers: false,
        splitLongVerses: options.splitLongVerses,
      },
      options.id ?? QUICK_PASSAGE_ID,
      true,
      scriptureThemeId(get),
    );
    get().upsertScripture(passage);
    return passage;
  },
});

const scriptureThemeId = (
  get: () => { prefs: { defaultScriptureThemeId: string } },
): string => {
  return get().prefs.defaultScriptureThemeId || SCRIPTURE_THEME_ID;
};
