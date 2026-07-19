import type {
  AudioItem,
  Background,
  ImportMode,
  MediaItem,
  Prefs,
  ScripturePassage,
  Song,
  Theme,
} from "../../types";
import { BACKGROUNDS } from "../../data/backgrounds";
import { DEFAULT_BIBLE_VERSION, isBibleVersion } from "../../data/bibleBooks";
import { THEMES } from "../../data/themes";
import { DEFAULT_AUDIO } from "../../data/sounds";
import { seedSongs } from "../../data/seed";
import { parseLyrics } from "../../lib/parser";
import { now, uid } from "../../lib/id";
import { readFile } from "../../lib/files";
import { dataFileSchema } from "../../lib/schema";
import { readAllRecords, clearStore, saveRecord } from "../../lib/storage";
import type { StoreName } from "../../lib/storage";
import { putFileBlob, thumbId } from "../../lib/fileStore";
import { probeImageFile } from "../../lib/media";
import { migrateLegacyBinaries } from "../../lib/migrateBinaries";
import { survivingAfterReset } from "../../lib/keepOnReset";
import { exportBackup, importBackupFiles, isZipFile, readBackupPayload } from "../../lib/backup";
import {
  BLOCK_MSG,
  WARN_MSG,
  customAudio,
  customBackgrounds,
  ensureBuiltInThemes,
  mergeById,
  sortBuiltInFirst,
} from "../helpers";
import { DEFAULT_PREFS } from "./prefsSlice";
import type { SliceCreator } from "../storeTypes";

export interface DataSlice {
  loading: boolean;
  resetting: boolean;

  load: () => Promise<void>;
  exportData: (onProgress?: (fraction: number) => void) => Promise<{ ok: boolean; cancelled?: boolean }>;
  importData: (
    file: File,
    mode: ImportMode,
    onProgress?: (fraction: number) => void
  ) => Promise<{ ok: boolean; message: string }>;
  resetApp: () => Promise<void>;
}

interface MaybeLegacyBinary {
  dataUrl?: string;
}

function normalizeImportedSong(entry: {
  id?: string;
  lyrics?: string;
  maxLines?: number;
  slides?: unknown[];
}): Song {
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

function normalizeImportedScripture(entry: { id?: string }): ScripturePassage {
  const passage = entry as unknown as ScripturePassage;
  return {
    ...passage,
    id: entry.id || uid(),
    versesPerSlide: passage.versesPerSlide ?? 1,
    showVerseNumbers: passage.showVerseNumbers ?? true,
    showReference: passage.showReference ?? true,
    slides: passage.slides ?? [],
    deleted: false,
    quick: undefined,
  };
}

function normalizeImportedMedia(entry: { id?: string }): MediaItem {
  const item = entry as unknown as MediaItem;
  return {
    ...item,
    id: entry.id || uid(),
    size: item.size || 0,
    createdAt: item.createdAt || now(),
    updatedAt: item.updatedAt || now(),
  };
}

/**
 * Legacy (v2/v3) exports inlined binaries as base64 dataUrls. Convert each
 * accepted record's payload into the "files" store one at a time and strip the
 * inline copy so nothing base64 survives the import. Returns whether a
 * thumbnail was generated.
 */
async function ingestLegacyDataUrl(
  record: MaybeLegacyBinary & { id: string; size?: number },
  blobId: string,
  makeThumb: boolean
): Promise<boolean> {
  if (!record.dataUrl) return false;
  let madeThumb = false;
  try {
    const blob = await (await fetch(record.dataUrl)).blob();
    await putFileBlob(blobId, blob);
    if (makeThumb) {
      const probe = await probeImageFile(blob);
      if (probe.thumbnail) {
        await putFileBlob(thumbId(blobId), probe.thumbnail);
        madeThumb = true;
      }
    }
    record.size = record.size || blob.size;
  } catch {
    /* keep the record; its preview will just be empty */
  }
  delete record.dataUrl;
  return madeThumb;
}

export const createDataSlice: SliceCreator<DataSlice> = (set, get) => ({
  loading: true,
  resetting: false,

  load: async () => {
    const [songs, scriptures, rawMedia, rawBackgrounds, rawAudio, themes, prefsRows] =
      await Promise.all([
        readAllRecords<Song>("songs"),
        readAllRecords<ScripturePassage>("scriptures"),
        readAllRecords<MediaItem>("media"),
        readAllRecords<Background>("backgrounds"),
        readAllRecords<AudioItem>("audio"),
        readAllRecords<Theme>("themes"),
        readAllRecords<Prefs>("prefs"),
      ]);

    const { media, backgrounds, audio } = await migrateLegacyBinaries(
      rawMedia,
      rawBackgrounds,
      rawAudio
    );

    let songList = songs;
    if (!songList.length) {
      songList = seedSongs();
      for (const song of songList) await saveRecord("songs", song);
    }

    let themeList = themes;
    if (!themeList.length) {
      themeList = THEMES;
      for (const theme of themeList) await saveRecord("themes", theme);
    }

    const prefs = prefsRows[0] ? { ...DEFAULT_PREFS, ...prefsRows[0] } : DEFAULT_PREFS;
    // Older releases offered copyrighted translations fetched over the
    // network; scripture is now bundled (public domain only), so stored
    // versions that no longer exist fall back to the default.
    if (!isBibleVersion(prefs.bibleVersion)) prefs.bibleVersion = DEFAULT_BIBLE_VERSION;
    // The per-chapter download cache is obsolete now that the text ships
    // with the app, clear leftovers from older releases.
    void clearStore("bible");

    set({
      songs: songList,
      scriptures,
      media,
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

  exportData: async (onProgress) => {
    onProgress?.(0.02);
    const { songs, scriptures, media, themes, backgrounds, audio, prefs } = get();
    const customBg = customBackgrounds(backgrounds);
    const customAud = customAudio(audio);
    const payload = {
      version: 4,
      exportedAt: now(),
      songs,
      scriptures: scriptures.filter((s) => !s.quick),
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
    for (const bg of customBg) {
      if (bg.blobId && bg.blobId === bg.id) fileIds.push(bg.blobId, thumbId(bg.blobId));
    }
    for (const item of customAud) {
      if (item.blobId) fileIds.push(item.blobId);
    }
    return exportBackup(payload, fileIds, onProgress);
  },

  importData: async (file, mode, onProgress) => {
    try {
      const zip = await isZipFile(file);
      const raw = zip
        ? await readBackupPayload(file)
        : JSON.parse(await readFile(file, "text"));
      const parsed = dataFileSchema.safeParse(raw);
      if (!parsed.success) {
        return { ok: false, message: "That file isn't a valid WorshipStudio backup." };
      }
      const data = parsed.data;
      const state = get();
      const override = mode === "override";
      const importedWins = mode !== "merge-existing";

      if (!override && state.storage?.blocked) {
        get().pushAlert(BLOCK_MSG, "error", "storage-block");
        return { ok: false, message: "Storage is full. Delete some data, or use Replace to import." };
      }

      let songs = state.songs;
      if (Array.isArray(data.songs)) {
        const incoming = data.songs.map(normalizeImportedSong);
        songs = override ? incoming : mergeById(state.songs, incoming, importedWins);
      }

      let scriptures = state.scriptures.filter((s) => !s.quick);
      if (Array.isArray(data.scriptures)) {
        const incoming = data.scriptures.map(normalizeImportedScripture);
        scriptures = override ? incoming : mergeById(scriptures, incoming, importedWins);
      }

      let media = state.media;
      const incomingMedia = Array.isArray(data.media) ? data.media.map(normalizeImportedMedia) : [];
      if (Array.isArray(data.media)) {
        media = override ? incomingMedia : mergeById(state.media, incomingMedia, importedWins);
      }

      let themes = state.themes;
      if (Array.isArray(data.themes)) {
        const incoming = data.themes as unknown as Theme[];
        themes = ensureBuiltInThemes(override ? incoming : mergeById(state.themes, incoming, importedWins));
      }

      let customBg = customBackgrounds(state.backgrounds);
      const incomingBg = Array.isArray(data.backgrounds)
        ? customBackgrounds(data.backgrounds as unknown as Background[])
        : [];
      if (Array.isArray(data.backgrounds)) {
        customBg = override ? incomingBg : mergeById(customBg, incomingBg, importedWins);
      }

      let customAud = customAudio(state.audio);
      const incomingAud = Array.isArray(data.audio)
        ? customAudio(data.audio as unknown as AudioItem[])
        : [];
      if (Array.isArray(data.audio)) {
        customAud = override ? incomingAud : mergeById(customAud, incomingAud, importedWins);
      }

      let prefs = state.prefs;
      if (data.prefs && (override || mode === "merge-imported")) {
        prefs = { ...DEFAULT_PREFS, ...(data.prefs as Partial<Prefs>), id: "app", onboarded: true };
        if (!isBibleVersion(prefs.bibleVersion)) prefs.bibleVersion = DEFAULT_BIBLE_VERSION;
      }

      // Binary ingestion happens only for incoming records that actually won
      // the merge, so "keep mine" never overwrites local files.
      const acceptedMedia = new Set(
        incomingMedia.filter((item) => media.includes(item)).map((item) => item.id)
      );
      const acceptedBg = incomingBg.filter((bg) => customBg.includes(bg));
      const acceptedAud = incomingAud.filter((aud) => customAud.includes(aud));

      if (override) {
        await Promise.all([
          clearStore("songs"),
          clearStore("scriptures"),
          clearStore("media"),
          clearStore("themes"),
          clearStore("backgrounds"),
          clearStore("audio"),
          clearStore("files"),
        ]);
      }

      if (zip) {
        const acceptedFileIds = new Set<string>();
        for (const id of acceptedMedia) {
          acceptedFileIds.add(id);
          acceptedFileIds.add(thumbId(id));
        }
        for (const bg of acceptedBg) {
          if (bg.blobId) {
            acceptedFileIds.add(bg.blobId);
            acceptedFileIds.add(thumbId(bg.blobId));
          }
        }
        for (const aud of acceptedAud) {
          if (aud.blobId) acceptedFileIds.add(aud.blobId);
        }
        await importBackupFiles(
          file,
          (id) => acceptedFileIds.has(id),
          (read, total) => onProgress?.(0.1 + 0.7 * (total ? read / total : 1))
        );
      } else {
        const acceptedMediaItems = media.filter((m) => acceptedMedia.has(m.id));
        const total = acceptedMediaItems.length + acceptedBg.length + acceptedAud.length;
        let done = 0;
        const step = () => onProgress?.(0.1 + 0.7 * (done / Math.max(1, total)));

        for (const item of acceptedMediaItems) {
          const madeThumb = await ingestLegacyDataUrl(item, item.id, item.kind === "image");
          if (madeThumb) item.hasThumb = true;
          done += 1;
          step();
        }
        for (const bg of acceptedBg) {
          if (!bg.blobId && bg.dataUrl) bg.blobId = bg.id;
          await ingestLegacyDataUrl(bg, bg.blobId || bg.id, bg.type === "image");
          done += 1;
          step();
        }
        for (const aud of acceptedAud) {
          if (!aud.blobId && aud.dataUrl) aud.blobId = aud.id;
          await ingestLegacyDataUrl(aud, aud.blobId || aud.id, false);
          done += 1;
          step();
        }
      }

      set({
        songs,
        scriptures,
        media,
        themes,
        backgrounds: [...BACKGROUNDS, ...customBg],
        audio: [...DEFAULT_AUDIO, ...customAud],
        prefs,
      });

      const puts: { store: StoreName; value: { id: string } }[] = [
        ...songs.map((value) => ({ store: "songs" as StoreName, value })),
        ...scriptures.map((value) => ({ store: "scriptures" as StoreName, value })),
        ...media.map((value) => ({ store: "media" as StoreName, value })),
        ...themes.map((value) => ({ store: "themes" as StoreName, value })),
        ...customBg.map((value) => ({ store: "backgrounds" as StoreName, value })),
        ...customAud.map((value) => ({ store: "audio" as StoreName, value })),
        { store: "prefs" as StoreName, value: prefs },
      ];

      let done = 0;
      for (const task of puts) {
        await saveRecord(task.store, task.value);
        done += 1;
        onProgress?.(0.8 + 0.2 * (done / puts.length));
      }

      const verb = override ? "replaced" : "merged";
      await get().refreshStorage();
      get().clearAlert("storage-block");
      return { ok: true, message: `Data ${verb} successfully.` };
    } catch {
      return { ok: false, message: "Could not read that backup file." };
    }
  },

  resetApp: async () => {
    set({ resetting: true, overlay: null, pendingUpload: null, presentation: null });
    const startedAt = Date.now();
    let keptTotal = 0;
    try {
      // Worked out before the stores are cleared: songs and custom themes the
      // user registered as "keep on reset" carry their own settings over, with
      // references to anything the reset wipes pointed back at the defaults.
      const survivors = survivingAfterReset({
        songs: get().songs,
        themes: get().themes,
        seedSongs: seedSongs(),
        builtInThemes: THEMES,
        builtInBackgrounds: BACKGROUNDS,
        builtInAudio: DEFAULT_AUDIO,
        defaultThemeId: DEFAULT_PREFS.defaultSongThemeId,
      });
      keptTotal = survivors.keptSongs.length + survivors.keptThemes.length;

      await Promise.all([
        clearStore("songs"),
        clearStore("scriptures"),
        clearStore("media"),
        clearStore("themes"),
        clearStore("backgrounds"),
        clearStore("audio"),
        clearStore("prefs"),
        clearStore("bible"),
        clearStore("files"),
      ]);
      for (const song of survivors.songs) await saveRecord("songs", song);
      for (const theme of survivors.themes) await saveRecord("themes", theme);
      await saveRecord("prefs", DEFAULT_PREFS);
      set({
        songs: survivors.songs,
        scriptures: [],
        media: [],
        themes: survivors.themes,
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
      get().pushToast(
        keptTotal
          ? `Reset complete. ${keptTotal} kept item${keptTotal === 1 ? "" : "s"} survived.`
          : "Reset complete. WorshipStudio is back to defaults."
      );
    }
  },
});
