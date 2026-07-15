import type { BibleVersionId, Prefs } from "../../types";
import { DEFAULT_BIBLE_VERSION } from "../../data/bibleBooks";
import { sPut } from "../../lib/storage";
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
  onboarded: false,
};

export interface PrefsSlice {
  prefs: Prefs;

  savePrefs: (prefs: Prefs) => void;
  setBibleVersion: (version: BibleVersionId) => void;
}

export const createPrefsSlice: SliceCreator<PrefsSlice> = (set, get) => ({
  prefs: DEFAULT_PREFS,

  savePrefs: (prefs) => {
    set({ prefs });
    void sPut("prefs", prefs);
  },

  setBibleVersion: (version) => {
    get().savePrefs({ ...get().prefs, bibleVersion: version });
  },
});
