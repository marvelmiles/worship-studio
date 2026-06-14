import { create } from "zustand";
import type { AppAlert, AudioItem, Background, ImportMode, Prefs, Song, Theme, Toast } from "../types";
import { BACKGROUNDS } from "../data/backgrounds";
import { THEMES } from "../data/themes";
import { DEFAULT_AUDIO } from "../data/sounds";
import { seedSongs } from "../data/seed";
import { parseLyrics } from "../lib/parser";
import { now, uid } from "../lib/id";
import { downloadJSON, readFile } from "../lib/files";
import { dataFileSchema } from "../lib/schema";
import { estimateQuota, sAll, sClear, sDel, sPut, sWipeAll, storageState } from "../lib/storage";
import type { StoreName } from "../lib/storage";
import { APP_RESERVE_IDB, bytesOf, computeStorageInfo } from "../lib/storageStats";
import type { StorageInfo } from "../lib/storageStats";
import { missingCapabilities } from "../lib/capabilities";

const DEFAULT_PREFS: Prefs = {
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
  onboarded: false,
};

export interface PresentTarget {
  songId: string;
  startIndex: number;
}

export type OverlayName = "assets" | "settings" | "themes" | "shortcuts" | "about";

export type UploadKind = "background" | "audio";

export interface PendingUpload {
  kind: UploadKind;
  files: File[];
  onComplete?: (ids: string[]) => void;
}

interface StoreState {
  loading: boolean;
  songs: Song[];
  backgrounds: Background[];
  audio: AudioItem[];
  themes: Theme[];
  prefs: Prefs;
  presentation: PresentTarget | null;
  overlay: OverlayName | null;
  toasts: Toast[];
  alerts: AppAlert[];
  storage: StorageInfo | null;
  pendingUpload: PendingUpload | null;
  resetting: boolean;
  showGuide: boolean;

  openOverlay: (name: OverlayName) => void;
  closeOverlay: () => void;

  completeGuide: () => void;
  resetApp: () => Promise<void>;

  pushToast: (message: string, kind?: Toast["kind"]) => void;
  dismissToast: (id: string) => void;
  pushAlert: (message: string, kind?: AppAlert["kind"], key?: string) => void;
  dismissAlert: (id: string) => void;
  clearAlert: (key: string) => void;
  refreshStorage: () => Promise<StorageInfo | null>;
  freeUpStorage: () => Promise<void>;
  runCapabilityCheck: () => void;

  load: () => Promise<void>;

  upsertSong: (song: Song) => void;
  createSong: () => Song | null;
  trashSong: (id: string) => void;
  restoreSong: (id: string) => void;
  deleteSong: (id: string) => void;

  uploadBackground: (file: File, name?: string) => Promise<string>;
  addCustomBackground: (value: string, name?: string) => string;
  removeBackground: (id: string) => Promise<void>;
  uploadAudio: (file: File, name?: string) => Promise<string>;
  removeAudio: (id: string) => Promise<void>;
  beginUpload: (kind: UploadKind, files: File[], onComplete?: (ids: string[]) => void) => void;
  cancelUpload: () => void;
  commitUpload: (labels: string[]) => Promise<void>;

  upsertTheme: (theme: Theme) => void;
  createTheme: () => Theme | null;
  deleteTheme: (id: string) => void;

  savePrefs: (prefs: Prefs) => void;

  exportData: (onProgress?: (fraction: number) => void) => Promise<void>;
  importData: (
    file: File,
    mode: ImportMode,
    onProgress?: (fraction: number) => void
  ) => Promise<{ ok: boolean; message: string }>;

  startPresent: (songId: string, startIndex?: number) => void;
  stopPresent: () => void;

  isMemoryFallback: () => boolean;
}

const customBackgrounds = (items: Background[]) => items.filter((b) => !b.builtIn);
const customAudio = (items: AudioItem[]) => items.filter((a) => !a.builtIn);

type Getter = () => StoreState;
const BLOCK_MSG =
  "Storage is full. Editing, creating, uploading and auto-save are paused until you free up space — delete some songs, audio or backgrounds.";
const WARN_MSG =
  "Storage is getting full. Consider deleting unused songs, audio or backgrounds so things keep running smoothly.";

// Returns true (and alerts) when an additive write must be blocked.
function blockWrite(get: Getter): boolean {
  if (get().storage?.blocked) {
    get().pushAlert(BLOCK_MSG, "error", "storage-block");
    return true;
  }
  return false;
}

// Recompute usage after an additive write and warn if we're in the warning band.
function afterWrite(get: Getter): void {
  void get()
    .refreshStorage()
    .then((info) => {
      if (!info) return;
      if (!info.blocked && info.level !== "ok") get().pushAlert(WARN_MSG, "warning", "storage-warn");
      else if (info.level === "ok") get().clearAlert("storage-warn");
    });
}

// Recompute usage after a delete and lift block/warn alerts once recovered.
function afterDelete(get: Getter): void {
  void get()
    .refreshStorage()
    .then((info) => {
      if (!info || info.blocked) return;
      get().clearAlert("storage-block");
      if (info.level === "ok") get().clearAlert("storage-warn");
    });
}

function mergeById<T extends { id: string }>(existing: T[], incoming: T[], importedWins: boolean): T[] {
  const map = new Map<string, T>();
  for (const item of importedWins ? existing : incoming) map.set(item.id, item);
  for (const item of importedWins ? incoming : existing) map.set(item.id, item);
  return [...map.values()];
}

/** Puts built-in themes first, ordered by their position in THEMES, then custom themes. */
function sortBuiltInFirst(themes: Theme[]): Theme[] {
  const order = THEMES.map((t) => t.id);
  return [...themes].sort((a, b) => {
    const ai = order.indexOf(a.id);
    const bi = order.indexOf(b.id);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return 0;
  });
}

function ensureBuiltInThemes(themes: Theme[]): Theme[] {
  const present = new Set(themes.map((t) => t.id));
  return sortBuiltInFirst([...themes, ...THEMES.filter((t) => !present.has(t.id))]);
}

function normalizeImportedSong(entry: { id?: string; lyrics?: string; maxLines?: number; slides?: unknown[] }): Song {
  const song = entry as unknown as Song;
  return {
    ...song,
    id: entry.id || uid(),
    deleted: false,
    slides:
      entry.slides && entry.slides.length
        ? (entry.slides as unknown as Song["slides"])
        : parseLyrics(entry.lyrics || "", entry.maxLines || 6),
  };
}

export const useStore = create<StoreState>((set, get) => ({
  loading: true,
  songs: [],
  backgrounds: BACKGROUNDS,
  audio: DEFAULT_AUDIO,
  themes: THEMES,
  prefs: DEFAULT_PREFS,
  presentation: null,
  overlay: null,
  toasts: [],
  alerts: [],
  storage: null,
  pendingUpload: null,
  resetting: false,
  showGuide: false,

  openOverlay: (name) => set({ overlay: name }),
  closeOverlay: () => set({ overlay: null }),

  completeGuide: () => {
    const prefs = { ...get().prefs, onboarded: true };
    set({ prefs, showGuide: false });
    void sPut("prefs", prefs);
  },

  pushToast: (message, kind = "success") =>
    set((state) => ({ toasts: [...state.toasts, { id: uid(), message, kind }] })),
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  pushAlert: (message, kind = "warning", key) =>
    set((state) => {
      const without = key ? state.alerts.filter((a) => a.key !== key) : state.alerts;
      return { alerts: [...without, { id: uid(), message, kind, key }] };
    }),
  dismissAlert: (id) => set((state) => ({ alerts: state.alerts.filter((a) => a.id !== id) })),
  clearAlert: (key) => set((state) => ({ alerts: state.alerts.filter((a) => a.key !== key) })),

  refreshStorage: async () => {
    const estimate = await estimateQuota();
    const state = get();
    const userUsed =
      bytesOf(state.songs.filter((s) => !s.builtIn)) +
      bytesOf(state.backgrounds.filter((b) => !b.builtIn)) +
      bytesOf(state.audio.filter((a) => !a.builtIn)) +
      bytesOf(state.themes.filter((t) => !t.builtIn));
    const backend = storageState.backend || "memory";
    const reserved =
      backend === "indexeddb"
        ? APP_RESERVE_IDB
        : bytesOf(state.songs.filter((s) => s.builtIn)) + bytesOf(state.themes.filter((t) => t.builtIn)) + 4096;
    const info = computeStorageInfo(estimate, userUsed, reserved, backend);
    set({ storage: info });
    return info;
  },

  freeUpStorage: async () => {
    await sWipeAll();
    const songs = seedSongs();
    for (const song of songs) await sPut("songs", song);
    for (const theme of THEMES) await sPut("themes", theme);
    await sPut("prefs", get().prefs);
    set({ songs, themes: THEMES, backgrounds: BACKGROUNDS, audio: DEFAULT_AUDIO });
    get().clearAlert("storage-block");
    get().clearAlert("storage-warn");
    await get().refreshStorage();
  },

  runCapabilityCheck: () => {
    const missing = missingCapabilities();
    if (missing.length === 0) return;
    const critical = missing.some((m) => m.critical);
    const names = missing.map((m) => m.label).join(", ");
    get().pushAlert(
      `${critical ? "Your browser is missing features WorshipStudio needs" : "Your browser is missing some features"} (${names}). For the best experience, please update to the latest version of your browser.`,
      critical ? "error" : "warning",
      "capabilities"
    );
  },

  load: async () => {
    const [songs, backgrounds, audio, themes, prefsRows] = await Promise.all([
      sAll<Song>("songs"),
      sAll<Background>("backgrounds"),
      sAll<AudioItem>("audio"),
      sAll<Theme>("themes"),
      sAll<Prefs>("prefs"),
    ]);

    let songList = songs;
    if (!songList.length) {
      songList = seedSongs();
      for (const song of songList) await sPut("songs", song);
    }

    let themeList = themes;
    if (!themeList.length) {
      themeList = THEMES;
      for (const theme of themeList) await sPut("themes", theme);
    }

    const prefs = prefsRows[0] ? { ...DEFAULT_PREFS, ...prefsRows[0] } : DEFAULT_PREFS;

    set({
      songs: songList,
      themes: sortBuiltInFirst(ensureBuiltInThemes(themeList)),
      backgrounds: [...BACKGROUNDS, ...customBackgrounds(backgrounds)],
      audio: [...DEFAULT_AUDIO, ...customAudio(audio)],
      prefs,
      showGuide: !prefs.onboarded,
      loading: false,
    });

    get().runCapabilityCheck();
    const info = await get().refreshStorage();
    if (info?.blocked) get().pushAlert(BLOCK_MSG, "error", "storage-block");
    else if (info && info.level !== "ok") get().pushAlert(WARN_MSG, "warning", "storage-warn");
  },

  upsertSong: (song) => {
    if (blockWrite(get)) return;
    set((state) => {
      const index = state.songs.findIndex((s) => s.id === song.id);
      const songs =
        index >= 0
          ? state.songs.map((s) => (s.id === song.id ? song : s))
          : [song, ...state.songs];
      return { songs };
    });
    void sPut("songs", song);
    afterWrite(get);
  },

  createSong: () => {
    if (blockWrite(get)) return null;
    const lyrics = "[verse]\nType your lyrics here";
    const song: Song = {
      id: uid(),
      title: "Untitled Song",
      artist: "",
      category: "Worship",
      defaultThemeId: "classic",
      defaultBackgroundId: "",
      defaultAudioId: null,
      lyrics,
      maxLines: 6,
      autoPlay: undefined,
      slideDurationSeconds: undefined,
      createdAt: now(),
      updatedAt: now(),
      deleted: false,
      builtIn: false,
      style: {},
      slides: parseLyrics(lyrics, 6),
    };
    get().upsertSong(song);
    return song;
  },

  trashSong: (id) => {
    const song = get().songs.find((s) => s.id === id);
    if (song && !song.builtIn) get().upsertSong({ ...song, deleted: true, updatedAt: now() });
  },
  restoreSong: (id) => {
    const song = get().songs.find((s) => s.id === id);
    if (song) get().upsertSong({ ...song, deleted: false, updatedAt: now() });
  },
  deleteSong: (id) => {
    const song = get().songs.find((s) => s.id === id);
    if (song?.builtIn) return;
    set((state) => ({ songs: state.songs.filter((s) => s.id !== id) }));
    void sDel("songs", id);
    afterDelete(get);
  },

  uploadBackground: async (file, name) => {
    const dataUrl = await readFile(file);
    const background: Background = {
      id: uid(),
      name: name?.trim() || file.name.replace(/\.[^.]+$/, ""),
      category: "Custom",
      type: "image",
      dataUrl,
      builtIn: false,
    };
    set((state) => ({ backgrounds: [...state.backgrounds, background] }));
    await sPut("backgrounds", background);
    return background.id;
  },
  removeBackground: async (id) => {
    const background = get().backgrounds.find((b) => b.id === id);
    if (background?.builtIn) return;
    set((state) => ({ backgrounds: state.backgrounds.filter((b) => b.id !== id) }));
    await sDel("backgrounds", id);
    afterDelete(get);
  },
  addCustomBackground: (value, name) => {
    if (blockWrite(get)) return "";
    const css = value.trim();
    const isGradient = /gradient\s*\(/i.test(css);
    const background: Background = {
      id: uid(),
      name: name?.trim() || (isGradient ? "Custom gradient" : css),
      category: "Custom",
      builtIn: false,
      ...(isGradient ? { type: "gradient", css } : { type: "solid", color: css }),
    };
    set((state) => ({ backgrounds: [...state.backgrounds, background] }));
    void sPut("backgrounds", background);
    afterWrite(get);
    return background.id;
  },
  uploadAudio: async (file, name) => {
    const dataUrl = await readFile(file);
    const item: AudioItem = {
      id: uid(),
      name: name?.trim() || file.name.replace(/\.[^.]+$/, ""),
      dataUrl,
      builtIn: false,
    };
    set((state) => ({ audio: [...state.audio, item] }));
    await sPut("audio", item);
    return item.id;
  },
  removeAudio: async (id) => {
    const item = get().audio.find((a) => a.id === id);
    if (item?.builtIn) return;
    set((state) => ({ audio: state.audio.filter((a) => a.id !== id) }));
    await sDel("audio", id);
    afterDelete(get);
  },

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
      const id =
        pending.kind === "background"
          ? await get().uploadBackground(file, label)
          : await get().uploadAudio(file, label);
      ids.push(id);
    }
    pending.onComplete?.(ids);
    set({ pendingUpload: null });
    afterWrite(get);
    get().pushToast(
      ids.length > 1
        ? `${ids.length} ${pending.kind === "background" ? "backgrounds" : "sounds"} added.`
        : `${pending.kind === "background" ? "Background" : "Sound"} added.`
    );
  },

  upsertTheme: (theme) => {
    if (blockWrite(get)) return;
    set((state) => {
      const index = state.themes.findIndex((t) => t.id === theme.id);
      const themes =
        index >= 0
          ? state.themes.map((t) => (t.id === theme.id ? theme : t))
          : [...state.themes, theme];
      return { themes };
    });
    void sPut("themes", theme);
    afterWrite(get);
  },
  createTheme: () => {
    if (blockWrite(get)) return null;
    const base = get().themes.find((t) => t.id === "classic") || get().themes[0];
    const theme: Theme = {
      ...base,
      id: uid(),
      name: "New Theme",
      builtIn: false,
    };
    get().upsertTheme(theme);
    return theme;
  },
  deleteTheme: (id) => {
    const theme = get().themes.find((t) => t.id === id);
    if (theme?.builtIn) return;
    set((state) => ({ themes: state.themes.filter((t) => t.id !== id) }));
    void sDel("themes", id);
    afterDelete(get);
  },

  savePrefs: (prefs) => {
    set({ prefs });
    void sPut("prefs", prefs);
  },

  resetApp: async () => {
    set({ resetting: true, overlay: null, pendingUpload: null, presentation: null });
    const startedAt = Date.now();
    try {
      await Promise.all([
        sClear("songs"),
        sClear("themes"),
        sClear("backgrounds"),
        sClear("audio"),
        sClear("prefs"),
      ]);
      const songs = seedSongs();
      for (const song of songs) await sPut("songs", song);
      for (const theme of THEMES) await sPut("themes", theme);
      await sPut("prefs", DEFAULT_PREFS);
      set({
        songs,
        themes: THEMES,
        backgrounds: BACKGROUNDS,
        audio: DEFAULT_AUDIO,
        prefs: DEFAULT_PREFS,
      });
    } finally {
      const elapsed = Date.now() - startedAt;
      if (elapsed < 900) await new Promise((resolve) => setTimeout(resolve, 900 - elapsed));
      get().clearAlert("storage-block");
      get().clearAlert("storage-warn");
      await get().refreshStorage();
      set({ resetting: false });
      get().pushToast("Reset complete. WorshipStudio is back to defaults.");
    }
  },

  exportData: async (onProgress) => {
    onProgress?.(0.2);
    const { songs, themes, backgrounds, audio, prefs } = get();
    const payload = {
      version: 2,
      exportedAt: now(),
      songs,
      themes,
      backgrounds: customBackgrounds(backgrounds),
      audio: customAudio(audio),
      prefs,
    };
    onProgress?.(0.6);
    downloadJSON(payload, `worshipflow-data-${new Date().toISOString().slice(0, 10)}.json`);
    onProgress?.(1);
  },

  importData: async (file, mode, onProgress) => {
    try {
      const text = await readFile(file, "text");
      const parsed = dataFileSchema.safeParse(JSON.parse(text));
      if (!parsed.success) {
        return { ok: false, message: "That file isn't a valid WorshipStudio data export." };
      }
      const data = parsed.data;
      const state = get();
      const override = mode === "override";
      const importedWins = mode !== "merge-existing";

      if (!override && state.storage?.blocked) {
        get().pushAlert(BLOCK_MSG, "error", "storage-block");
        return { ok: false, message: "Storage is full — delete some data, or use Replace to import." };
      }

      let songs = state.songs;
      if (Array.isArray(data.songs)) {
        const incoming = data.songs.map(normalizeImportedSong);
        songs = override ? incoming : mergeById(state.songs, incoming, importedWins);
      }

      let themes = state.themes;
      if (Array.isArray(data.themes)) {
        const incoming = data.themes as unknown as Theme[];
        themes = ensureBuiltInThemes(override ? incoming : mergeById(state.themes, incoming, importedWins));
      }

      let customBg = customBackgrounds(state.backgrounds);
      if (Array.isArray(data.backgrounds)) {
        const incoming = customBackgrounds(data.backgrounds as unknown as Background[]);
        customBg = override ? incoming : mergeById(customBg, incoming, importedWins);
      }

      let customAud = customAudio(state.audio);
      if (Array.isArray(data.audio)) {
        const incoming = customAudio(data.audio as unknown as AudioItem[]);
        customAud = override ? incoming : mergeById(customAud, incoming, importedWins);
      }

      let prefs = state.prefs;
      if (data.prefs && (override || mode === "merge-imported")) {
        prefs = { ...DEFAULT_PREFS, ...(data.prefs as Partial<Prefs>), id: "app", onboarded: true };
      }

      set({
        songs,
        themes,
        backgrounds: [...BACKGROUNDS, ...customBg],
        audio: [...DEFAULT_AUDIO, ...customAud],
        prefs,
      });

      if (override) {
        await Promise.all([sClear("songs"), sClear("themes"), sClear("backgrounds"), sClear("audio")]);
      }

      const puts: { store: StoreName; value: { id: string } }[] = [
        ...songs.map((value) => ({ store: "songs" as StoreName, value })),
        ...themes.map((value) => ({ store: "themes" as StoreName, value })),
        ...customBg.map((value) => ({ store: "backgrounds" as StoreName, value })),
        ...customAud.map((value) => ({ store: "audio" as StoreName, value })),
        { store: "prefs" as StoreName, value: prefs },
      ];

      let done = 0;
      for (const task of puts) {
        await sPut(task.store, task.value);
        done += 1;
        onProgress?.(done / puts.length);
      }

      const verb = override ? "replaced" : "merged";
      await get().refreshStorage();
      get().clearAlert("storage-block");
      return { ok: true, message: `Data ${verb} successfully.` };
    } catch {
      return { ok: false, message: "Could not read that data file." };
    }
  },

  startPresent: (songId, startIndex = 0) => {
    const song = get().songs.find((s) => s.id === songId);
    if (song?.slides?.length) set({ presentation: { songId, startIndex } });
  },
  stopPresent: () => set({ presentation: null }),

  isMemoryFallback: () => storageState.memFallback,
}));
