import type {
  AudioItem,
  Background,
  ImportMode,
  Manuscript,
  MediaItem,
  Prefs,
  ScripturePassage,
  Theme,
} from "../../types";
import { BACKGROUNDS } from "../../data/backgrounds";
import { DEFAULT_BIBLE_VERSION, isBibleVersion } from "../../data/bibleBooks";
import { THEMES } from "../../data/themes";
import { DEFAULT_AUDIO } from "../../data/sounds";
import { seedManuscripts } from "../../data/seed";
import { now } from "../../lib/id";
import { dataFileSchema } from "../../lib/schema";
import { readAllRecords, clearStore, saveRecord } from "../../lib/storage";
import type { StoreName } from "../../lib/storage";
import { thumbId } from "../../lib/fileStore";
import { survivingAfterReset } from "../../lib/keepOnReset";
import {
  exportBackup,
  importBackupFiles,
  isZipFile,
  readBackupPayload,
} from "../../lib/backup";
import {
  BLOCK_MSG,
  WARN_MSG,
  customAudio,
  customBackgrounds,
  ensureBuiltInThemes,
  mergeById,
  sortBuiltInFirst,
} from "../helpers";
import {
  normalizeImportedBackground,
  normalizeImportedManuscript,
  normalizeImportedMedia,
  normalizeImportedScripture,
} from "../importNormalizers";
import { DEFAULT_PREFS } from "./prefsSlice";
import type { SliceCreator } from "../storeTypes";

const BACKUP_VERSION = 5;
const MIN_RESET_OVERLAY_MS = 900;

export interface DataSlice {
  loading: boolean;
  resetting: boolean;

  load: () => Promise<void>;
  exportData: (
    onProgress?: (fraction: number) => void,
  ) => Promise<{ ok: boolean; cancelled?: boolean }>;
  importData: (
    file: File,
    mode: ImportMode,
    onProgress?: (fraction: number) => void,
  ) => Promise<{ ok: boolean; message: string }>;
  resetApp: () => Promise<void>;
}

const withSupportedBibleVersion = (prefs: Prefs): Prefs =>
  isBibleVersion(prefs.bibleVersion)
    ? prefs
    : { ...prefs, bibleVersion: DEFAULT_BIBLE_VERSION };

const mergeIncoming = <T extends { id: string }>(
  current: T[],
  incoming: T[] | undefined,
  isOverride: boolean,
  importedWins: boolean,
): T[] => {
  if (!incoming) return current;
  return isOverride ? incoming : mergeById(current, incoming, importedWins);
};

export const createDataSlice: SliceCreator<DataSlice> = (set, get) => ({
  loading: true,
  resetting: false,

  load: async () => {
    const [
      storedManuscripts,
      scriptures,
      media,
      backgrounds,
      audio,
      storedThemes,
      prefsRows,
    ] = await Promise.all([
      readAllRecords<Manuscript>("manuscripts"),
      readAllRecords<ScripturePassage>("scriptures"),
      readAllRecords<MediaItem>("media"),
      readAllRecords<Background>("backgrounds"),
      readAllRecords<AudioItem>("audio"),
      readAllRecords<Theme>("themes"),
      readAllRecords<Prefs>("prefs"),
    ]);

    let manuscripts = storedManuscripts;
    if (!manuscripts.length) {
      manuscripts = seedManuscripts();
      for (const manuscript of manuscripts) {
        await saveRecord("manuscripts", manuscript);
      }
    }

    let themes = storedThemes;
    if (!themes.length) {
      themes = THEMES;
      for (const theme of themes) await saveRecord("themes", theme);
    }

    const prefs = withSupportedBibleVersion(
      prefsRows[0] ? { ...DEFAULT_PREFS, ...prefsRows[0] } : DEFAULT_PREFS,
    );

    set({
      manuscripts,
      scriptures,
      media,
      themes: sortBuiltInFirst(ensureBuiltInThemes(themes)),
      backgrounds: [...BACKGROUNDS, ...customBackgrounds(backgrounds)],
      audio: [...DEFAULT_AUDIO, ...customAudio(audio)],
      prefs,
      showGuide: !prefs.onboarded,
      loading: false,
    });

    get().runCapabilityCheck();
    const storageInfo = await get().refreshStorage();
    if (storageInfo?.blocked) {
      get().pushAlert(BLOCK_MSG, "error", "storage-block");
    } else if (storageInfo && storageInfo.level !== "ok") {
      get().pushAlert(WARN_MSG, "warning", "storage-warn");
    }
  },

  exportData: async (onProgress) => {
    onProgress?.(0.02);
    const {
      manuscripts,
      scriptures,
      media,
      themes,
      backgrounds,
      audio,
      prefs,
    } = get();
    const customBg = customBackgrounds(backgrounds);
    const customAud = customAudio(audio);
    const payload = {
      version: BACKUP_VERSION,
      exportedAt: now(),
      manuscripts,
      scriptures: scriptures.filter((scripture) => !scripture.quick),
      media,
      themes,
      backgrounds: customBg,
      audio: customAud,
      prefs,
    };
    const fileIds: string[] = [];
    for (const item of media) {
      fileIds.push(item.id);
      if (item.hasThumb) fileIds.push(thumbId(item.id));
    }
    for (const background of customBg) {
      if (background.blobId && background.blobId === background.id) {
        fileIds.push(background.blobId, thumbId(background.blobId));
      }
    }
    for (const item of customAud) {
      if (item.blobId && !item.mediaId) fileIds.push(item.blobId);
    }
    return exportBackup(payload, fileIds, onProgress);
  },

  importData: async (file, mode, onProgress) => {
    const invalidBackup = {
      ok: false,
      message: "That file isn't a valid WorshipStudio backup.",
    };
    try {
      if (!(await isZipFile(file))) return invalidBackup;
      const parsed = dataFileSchema.safeParse(await readBackupPayload(file));
      if (!parsed.success) return invalidBackup;

      const data = parsed.data;
      const state = get();
      const isOverride = mode === "override";
      const importedWins = mode !== "merge-existing";

      if (!isOverride && state.storage?.blocked) {
        get().pushAlert(BLOCK_MSG, "error", "storage-block");
        return {
          ok: false,
          message:
            "Storage is full. Delete some data, or use Replace to import.",
        };
      }

      const incomingMedia = data.media?.map(normalizeImportedMedia);
      const incomingBackgrounds = data.backgrounds
        ? customBackgrounds(data.backgrounds.map(normalizeImportedBackground))
        : undefined;
      const incomingAudio: AudioItem[] | undefined = data.audio
        ? customAudio(data.audio)
        : undefined;

      const manuscripts = mergeIncoming(
        state.manuscripts,
        data.manuscripts?.map(normalizeImportedManuscript),
        isOverride,
        importedWins,
      );
      const scriptures = mergeIncoming(
        state.scriptures.filter((scripture) => !scripture.quick),
        data.scriptures?.map(normalizeImportedScripture),
        isOverride,
        importedWins,
      );
      const media = mergeIncoming(
        state.media,
        incomingMedia,
        isOverride,
        importedWins,
      );
      const themes = data.themes
        ? ensureBuiltInThemes(
            mergeIncoming(state.themes, data.themes, isOverride, importedWins),
          )
        : state.themes;
      const customBg = mergeIncoming(
        customBackgrounds(state.backgrounds),
        incomingBackgrounds,
        isOverride,
        importedWins,
      );
      const customAud = mergeIncoming(
        customAudio(state.audio),
        incomingAudio,
        isOverride,
        importedWins,
      );

      const prefs =
        data.prefs && (isOverride || mode === "merge-imported")
          ? withSupportedBibleVersion({
              ...DEFAULT_PREFS,
              ...(data.prefs as Partial<Prefs>),
              id: "app",
              onboarded: true,
            })
          : state.prefs;

      // Only files belonging to records that won the merge are unpacked, so "keep mine" never overwrites local files.
      const acceptedFileIds = new Set<string>();
      for (const item of incomingMedia ?? []) {
        if (!media.includes(item)) continue;
        acceptedFileIds.add(item.id);
        acceptedFileIds.add(thumbId(item.id));
      }
      for (const background of incomingBackgrounds ?? []) {
        if (!customBg.includes(background) || !background.blobId) continue;
        acceptedFileIds.add(background.blobId);
        acceptedFileIds.add(thumbId(background.blobId));
      }
      for (const item of incomingAudio ?? []) {
        if (customAud.includes(item) && item.blobId) {
          acceptedFileIds.add(item.blobId);
        }
      }

      if (isOverride) {
        await Promise.all(
          (
            [
              "manuscripts",
              "scriptures",
              "media",
              "themes",
              "backgrounds",
              "audio",
              "files",
            ] as StoreName[]
          ).map(clearStore),
        );
      }

      await importBackupFiles(
        file,
        (id) => acceptedFileIds.has(id),
        (read, total) => onProgress?.(0.1 + 0.7 * (total ? read / total : 1)),
      );

      set({
        manuscripts,
        scriptures,
        media,
        themes,
        backgrounds: [...BACKGROUNDS, ...customBg],
        audio: [...DEFAULT_AUDIO, ...customAud],
        prefs,
      });

      const writes: { store: StoreName; value: { id: string } }[] = [
        ...manuscripts.map((value) => ({
          store: "manuscripts" as const,
          value,
        })),
        ...scriptures.map((value) => ({ store: "scriptures" as const, value })),
        ...media.map((value) => ({ store: "media" as const, value })),
        ...themes.map((value) => ({ store: "themes" as const, value })),
        ...customBg.map((value) => ({ store: "backgrounds" as const, value })),
        ...customAud.map((value) => ({ store: "audio" as const, value })),
        { store: "prefs", value: prefs },
      ];

      let writtenCount = 0;
      for (const write of writes) {
        await saveRecord(write.store, write.value);
        writtenCount += 1;
        onProgress?.(0.8 + 0.2 * (writtenCount / writes.length));
      }

      await get().refreshStorage();
      get().clearAlert("storage-block");
      return {
        ok: true,
        message: `Data ${isOverride ? "replaced" : "merged"} successfully.`,
      };
    } catch {
      return { ok: false, message: "Could not read that backup file." };
    }
  },

  resetApp: async () => {
    set({
      resetting: true,
      overlay: null,
      pendingUpload: null,
      presentation: null,
    });
    const startedAt = Date.now();
    let keptTotal = 0;
    try {
      // Computed before the stores are cleared, so kept items can repoint references at surviving defaults.
      const survivors = survivingAfterReset({
        manuscripts: get().manuscripts,
        themes: get().themes,
        seedManuscripts: seedManuscripts(),
        builtInThemes: THEMES,
        builtInBackgrounds: BACKGROUNDS,
        builtInAudio: DEFAULT_AUDIO,
        defaultThemeId: DEFAULT_PREFS.defaultManuscriptThemeId,
      });
      keptTotal =
        survivors.keptManuscripts.length + survivors.keptThemes.length;

      await Promise.all(
        (
          [
            "manuscripts",
            "scriptures",
            "media",
            "themes",
            "backgrounds",
            "audio",
            "prefs",
            "files",
          ] as StoreName[]
        ).map(clearStore),
      );
      for (const manuscript of survivors.manuscripts) {
        await saveRecord("manuscripts", manuscript);
      }
      for (const theme of survivors.themes) await saveRecord("themes", theme);
      await saveRecord("prefs", DEFAULT_PREFS);
      set({
        manuscripts: survivors.manuscripts,
        scriptures: [],
        media: [],
        themes: survivors.themes,
        backgrounds: BACKGROUNDS,
        audio: DEFAULT_AUDIO,
        prefs: DEFAULT_PREFS,
      });
    } finally {
      const elapsedMs = Date.now() - startedAt;
      if (elapsedMs < MIN_RESET_OVERLAY_MS) {
        await new Promise((resolve) =>
          setTimeout(resolve, MIN_RESET_OVERLAY_MS - elapsedMs),
        );
      }
      get().clearAlert("storage-block");
      get().clearAlert("storage-warn");
      await get().refreshStorage();
      set({ resetting: false });
      get().pushToast(
        keptTotal
          ? `Reset complete. ${keptTotal} kept item${keptTotal === 1 ? "" : "s"} survived.`
          : "Reset complete. WorshipStudio is back to defaults.",
      );
    }
  },
});
