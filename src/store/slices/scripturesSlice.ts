import type { BibleVerse, BibleVersionId, PassageRange, ScripturePassage } from "../../types";
import { now, uid } from "../../lib/id";
import { sDel, sPut } from "../../lib/storage";
import { buildScriptureSlides } from "../../features/bible/lib/scriptureSlides";
import { formatReference } from "../../features/bible/lib/reference";
import { afterDelete, afterWrite, blockWrite } from "../helpers";
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
}

export interface ScripturesSlice {
  scriptures: ScripturePassage[];

  upsertScripture: (passage: ScripturePassage) => void;
  saveScripturePassage: (options: SavePassageOptions) => ScripturePassage | null;
  rebuildScriptureSlides: (id: string, changes?: Partial<ScripturePassage>) => void;
  trashScripture: (id: string) => void;
  restoreScripture: (id: string) => void;
  deleteScripture: (id: string) => void;
  presentScriptureSelection: (selection: ScriptureSelection) => void;
  stageScriptureSelection: (selection: ScriptureSelection) => ScripturePassage | null;
}

function buildPassage(
  options: SavePassageOptions,
  id: string,
  quick: boolean,
  themeId: string = SCRIPTURE_THEME_ID
): ScripturePassage {
  const versesPerSlide = options.versesPerSlide ?? 1;
  const showVerseNumbers = options.showVerseNumbers ?? true;
  const showReference = options.showReference ?? true;
  return {
    id,
    title: formatReference(options.range, options.version),
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
    }),
    defaultThemeId: themeId,
    defaultBackgroundId: "",
    defaultAudioId: null,
    style: {},
    createdAt: now(),
    updatedAt: now(),
    deleted: false,
    builtIn: false,
  };
}

export const createScripturesSlice: SliceCreator<ScripturesSlice> = (set, get) => ({
  scriptures: [],

  upsertScripture: (passage) => {
    if (blockWrite(get)) return;
    set((state) => {
      const exists = state.scriptures.some((s) => s.id === passage.id);
      const scriptures = exists
        ? state.scriptures.map((s) => (s.id === passage.id ? passage : s))
        : [passage, ...state.scriptures];
      return { scriptures };
    });
    void sPut("scriptures", passage);
    afterWrite(get);
  },

  saveScripturePassage: (options) => {
    if (blockWrite(get)) return null;
    const passage = buildPassage(options, uid(), false, scriptureThemeId(get));
    get().upsertScripture(passage);
    return passage;
  },

  rebuildScriptureSlides: (id, changes = {}) => {
    const current = get().scriptures.find((s) => s.id === id);
    if (!current) return;
    const next: ScripturePassage = { ...current, ...changes, updatedAt: now() };
    next.slides = buildScriptureSlides({
      version: next.version,
      range: next.range,
      verses: next.verses,
      versesPerSlide: next.versesPerSlide,
      showVerseNumbers: next.showVerseNumbers,
      showReference: next.showReference,
    });
    next.title = formatReference(next.range, next.version);
    get().upsertScripture(next);
  },

  trashScripture: (id) => {
    const passage = get().scriptures.find((s) => s.id === id);
    if (passage) get().upsertScripture({ ...passage, deleted: true, updatedAt: now() });
  },
  restoreScripture: (id) => {
    const passage = get().scriptures.find((s) => s.id === id);
    if (passage) get().upsertScripture({ ...passage, deleted: false, updatedAt: now() });
  },
  deleteScripture: (id) => {
    set((state) => ({ scriptures: state.scriptures.filter((s) => s.id !== id) }));
    void sDel("scriptures", id);
    afterDelete(get);
  },

  presentScriptureSelection: (selection) => {
    if (blockWrite(get)) return;
    const passage = buildPassage(selection, QUICK_PASSAGE_ID, true, scriptureThemeId(get));
    get().upsertScripture(passage);
    get().startPresent("scripture", passage.id, 0);
  },

  stageScriptureSelection: (selection) => {
    if (blockWrite(get)) return null;
    const passage = buildPassage(selection, QUICK_PASSAGE_ID, true, scriptureThemeId(get));
    get().upsertScripture(passage);
    return passage;
  },
});

function scriptureThemeId(get: () => { prefs: { defaultScriptureThemeId: string } }): string {
  return get().prefs.defaultScriptureThemeId || SCRIPTURE_THEME_ID;
}
