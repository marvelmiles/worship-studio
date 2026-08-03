import type { BibleVersionId, Prefs } from "../../types";
import { DEFAULT_BIBLE_VERSION } from "../../data/bibleBooks";
import { saveRecord } from "../../lib/storage";
import type { SliceCreator } from "../storeTypes";

export const DEFAULT_PREFS: Prefs = {
  id: "app",
  transition: "fade",
  transitionDuration: 500,
  easing: "ease",
  backgroundVolume: 70,
  loopAudio: true,
  showPresenterBar: true,
  presentationView: "normal",
  autoHideControls: true,
  autoHidePresenterBar: true,
  bibleVersion: DEFAULT_BIBLE_VERSION,
  defaultManuscriptThemeId: "classic",
  defaultScriptureThemeId: "scripture",
  onboarded: false,
};

/** Preference name from before the songs module became manuscripts. */
interface LegacyPrefs {
  defaultSongThemeId?: string;
}

/** Carries pre-rename preferences over to their current names. */
export function normalizeStoredPrefs(
  stored: Partial<Prefs> & LegacyPrefs,
): Partial<Prefs> {
  const { defaultSongThemeId, ...rest } = stored;
  const themeId = stored.defaultManuscriptThemeId ?? defaultSongThemeId;
  // Left out entirely when neither name is stored, so the default stands.
  return themeId ? { ...rest, defaultManuscriptThemeId: themeId } : rest;
}

export interface PrefsSlice {
  prefs: Prefs;

  savePrefs: (prefs: Prefs) => void;
  setBibleVersion: (version: BibleVersionId) => void;
}

export const createPrefsSlice: SliceCreator<PrefsSlice> = (set, get) => ({
  prefs: DEFAULT_PREFS,

  savePrefs: (prefs) => {
    set({ prefs });
    void saveRecord("prefs", prefs);
  },

  setBibleVersion: (version) => {
    get().savePrefs({ ...get().prefs, bibleVersion: version });
  },
});
