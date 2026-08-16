import type {
  AudioItem,
  Background,
  ImageSettings,
  ImportMode,
  LegacyManuscriptFields,
  Manuscript,
  MediaItem,
  Prefs,
  ScripturePassage,
  Slide,
  Theme,
} from "../../types";
import { BACKGROUNDS } from "../../data/backgrounds";
import { DEFAULT_BIBLE_VERSION, isBibleVersion } from "../../data/bibleBooks";
import { THEMES } from "../../data/themes";
import { DEFAULT_AUDIO } from "../../data/sounds";
import { seedManuscripts } from "../../data/seed";
import { DEFAULT_COLLECTION } from "../../data/collections";
import { parseManuscriptSlides } from "../../lib/parser";
import { resolveManuscriptFormat } from "../../lib/manuscript/format";
import { normalizeSlideMedia } from "../../lib/slideMedia";
import { normalizeSlideTextBox } from "../../lib/slideTextBox";
import { now, uid } from "../../lib/id";
import { readFile } from "../../lib/files";
import {
  DEFAULT_BACKGROUND_IMAGE_SETTINGS,
  DEFAULT_IMAGE_SETTINGS,
  DEFAULT_VIDEO_SETTINGS,
} from "../../lib/media";
import { dataFileSchema } from "../../lib/schema";
import type {
  ImportedBackground,
  ImportedManuscript,
  ImportedMedia,
  ImportedScripture,
  ImportedSlide,
} from "../../lib/schema";
import {
  readAllRecords,
  clearStore,
  saveRecord,
  LEGACY_MANUSCRIPT_STORE,
} from "../../lib/storage";
import type { StoreName } from "../../lib/storage";
import { normalizeStoredManuscript } from "./manuscriptsSlice";
import { putFileBlob, thumbId } from "../../lib/fileStore";
import { probeImageFile } from "../../lib/media";
import { migrateLegacyBinaries } from "../../lib/migrateBinaries";
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
import { DEFAULT_PREFS, normalizeStoredPrefs } from "./prefsSlice";
import type { SliceCreator } from "../storeTypes";

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

interface MaybeLegacyBinary {
  dataUrl?: string;
}

/** Completes the picture settings an import may only have partially written. */
function normalizeImportedBackgroundImage(
  settings: Partial<ImageSettings> | undefined,
): ImageSettings | undefined {
  return settings
    ? { ...DEFAULT_BACKGROUND_IMAGE_SETTINGS, ...settings }
    : undefined;
}

/** Fills in every required Slide field a loosely-validated import may omit. */
function normalizeImportedSlide(slide: ImportedSlide): Slide {
  const { backgroundImage, ...overrides } = slide.overrides ?? {};
  return {
    ...slide,
    id: slide.id || uid(),
    type: slide.type ?? "verse",
    label: slide.label ?? "",
    lines: slide.lines ?? [],
    overrides: {
      ...overrides,
      backgroundImage: normalizeImportedBackgroundImage(backgroundImage),
    },
    media: slide.media?.map(normalizeSlideMedia),
    textBoxes: slide.textBoxes?.map(normalizeSlideTextBox),
    notes: slide.notes ?? "",
  };
}

function normalizeImportedManuscript(entry: ImportedManuscript): Manuscript {
  const timestamp = now();
  const { artist, category, lyrics, ...rest } = entry;
  const body = entry.body ?? lyrics ?? "";
  return {
    ...rest,
    id: entry.id || uid(),
    body,
    defaultBackgroundImage: normalizeImportedBackgroundImage(
      entry.defaultBackgroundImage,
    ),
    author: entry.author ?? artist,
    collection: entry.collection ?? category ?? DEFAULT_COLLECTION,
    createdAt: entry.createdAt ?? timestamp,
    updatedAt: entry.updatedAt ?? timestamp,
    deleted: false,
    slides:
      entry.slides && entry.slides.length
        ? entry.slides.map(normalizeImportedSlide)
        : parseManuscriptSlides(body, {
            maxLines: entry.maxLines ?? 6,
            format: resolveManuscriptFormat({
              format: entry.format,
              collection: entry.collection ?? category,
            }),
          }),
  };
}

function normalizeImportedScripture(
  entry: ImportedScripture,
): ScripturePassage {
  const timestamp = now();
  return {
    ...entry,
    id: entry.id || uid(),
    defaultBackgroundImage: normalizeImportedBackgroundImage(
      entry.defaultBackgroundImage,
    ),
    version: isBibleVersion(entry.version)
      ? entry.version
      : DEFAULT_BIBLE_VERSION,
    versesPerSlide: entry.versesPerSlide ?? 1,
    showVerseNumbers: entry.showVerseNumbers ?? true,
    showReference: entry.showReference ?? true,
    slides: entry.slides ? entry.slides.map(normalizeImportedSlide) : [],
    createdAt: entry.createdAt ?? timestamp,
    updatedAt: entry.updatedAt ?? timestamp,
    deleted: false,
    quick: undefined,
  };
}

function normalizeImportedMedia(entry: ImportedMedia): MediaItem {
  const timestamp = now();
  return {
    ...entry,
    id: entry.id || uid(),
    size: entry.size ?? 0,
    createdAt: entry.createdAt ?? timestamp,
    updatedAt: entry.updatedAt ?? timestamp,
    image:
      entry.kind === "image"
        ? { ...DEFAULT_IMAGE_SETTINGS, ...(entry.image ?? {}) }
        : undefined,
    video:
      entry.kind === "video"
        ? { ...DEFAULT_VIDEO_SETTINGS, ...(entry.video ?? {}) }
        : undefined,
  };
}

/** Custom backgrounds carry a required category; imports may leave it blank. */
function normalizeImportedBackground(entry: ImportedBackground): Background {
  return {
    ...entry,
    category: entry.category ?? "Custom",
    image: normalizeImportedBackgroundImage(entry.image),
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
  makeThumb: boolean,
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
    const [
      storedManuscripts,
      scriptures,
      rawMedia,
      rawBackgrounds,
      rawAudio,
      themes,
      prefsRows,
    ] = await Promise.all([
      readAllRecords<Manuscript & LegacyManuscriptFields>("manuscripts"),
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
      rawAudio,
    );

    // A library written before the rename still lives in the "songs" store;
    // it is read once, carried over under the current names, and the old
    // store is retired so the migration never runs twice.
    let manuscriptList = storedManuscripts.map(normalizeStoredManuscript);
    if (!manuscriptList.length) {
      const legacy = await readAllRecords<Manuscript & LegacyManuscriptFields>(
        LEGACY_MANUSCRIPT_STORE,
      );
      manuscriptList = legacy.length
        ? legacy.map(normalizeStoredManuscript)
        : seedManuscripts();
      for (const manuscript of manuscriptList)
        await saveRecord("manuscripts", manuscript);
      if (legacy.length) await clearStore(LEGACY_MANUSCRIPT_STORE);
    }

    let themeList = themes;
    if (!themeList.length) {
      themeList = THEMES;
      for (const theme of themeList) await saveRecord("themes", theme);
    }

    const prefs = prefsRows[0]
      ? { ...DEFAULT_PREFS, ...normalizeStoredPrefs(prefsRows[0]) }
      : DEFAULT_PREFS;
    // Older releases offered copyrighted translations fetched over the
    // network; scripture is now bundled (public domain only), so stored
    // versions that no longer exist fall back to the default.
    if (!isBibleVersion(prefs.bibleVersion))
      prefs.bibleVersion = DEFAULT_BIBLE_VERSION;
    // The per-chapter download cache is obsolete now that the text ships
    // with the app, clear leftovers from older releases.
    void clearStore("bible");

    set({
      manuscripts: manuscriptList,
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
    else if (info && info.level !== "ok")
      get().pushAlert(WARN_MSG, "warning", "storage-warn");
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
      version: 5,
      exportedAt: now(),
      manuscripts,
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
      if (bg.blobId && bg.blobId === bg.id)
        fileIds.push(bg.blobId, thumbId(bg.blobId));
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
        return {
          ok: false,
          message: "That file isn't a valid WorshipStudio backup.",
        };
      }
      const data = parsed.data;
      const state = get();
      const override = mode === "override";
      const importedWins = mode !== "merge-existing";

      if (!override && state.storage?.blocked) {
        get().pushAlert(BLOCK_MSG, "error", "storage-block");
        return {
          ok: false,
          message:
            "Storage is full. Delete some data, or use Replace to import.",
        };
      }

      // Backups made before the rename carry the same records under "songs".
      const incomingManuscripts = data.manuscripts ?? data.songs;
      let manuscripts = state.manuscripts;
      if (Array.isArray(incomingManuscripts)) {
        const incoming = incomingManuscripts.map(normalizeImportedManuscript);
        manuscripts = override
          ? incoming
          : mergeById(state.manuscripts, incoming, importedWins);
      }

      let scriptures = state.scriptures.filter((s) => !s.quick);
      if (Array.isArray(data.scriptures)) {
        const incoming = data.scriptures.map(normalizeImportedScripture);
        scriptures = override
          ? incoming
          : mergeById(scriptures, incoming, importedWins);
      }

      let media = state.media;
      const incomingMedia = Array.isArray(data.media)
        ? data.media.map(normalizeImportedMedia)
        : [];
      if (Array.isArray(data.media)) {
        media = override
          ? incomingMedia
          : mergeById(state.media, incomingMedia, importedWins);
      }

      let themes = state.themes;
      if (Array.isArray(data.themes)) {
        const incoming: Theme[] = data.themes;
        themes = ensureBuiltInThemes(
          override ? incoming : mergeById(state.themes, incoming, importedWins),
        );
      }

      let customBg = customBackgrounds(state.backgrounds);
      const incomingBg = Array.isArray(data.backgrounds)
        ? customBackgrounds(data.backgrounds.map(normalizeImportedBackground))
        : [];
      if (Array.isArray(data.backgrounds)) {
        customBg = override
          ? incomingBg
          : mergeById(customBg, incomingBg, importedWins);
      }

      let customAud = customAudio(state.audio);
      const incomingAud: AudioItem[] = Array.isArray(data.audio)
        ? customAudio(data.audio)
        : [];
      if (Array.isArray(data.audio)) {
        customAud = override
          ? incomingAud
          : mergeById(customAud, incomingAud, importedWins);
      }

      let prefs = state.prefs;
      if (data.prefs && (override || mode === "merge-imported")) {
        prefs = {
          ...DEFAULT_PREFS,
          ...normalizeStoredPrefs(data.prefs as Partial<Prefs>),
          id: "app",
          onboarded: true,
        };
        if (!isBibleVersion(prefs.bibleVersion))
          prefs.bibleVersion = DEFAULT_BIBLE_VERSION;
      }

      // Binary ingestion happens only for incoming records that actually won
      // the merge, so "keep mine" never overwrites local files.
      const acceptedMedia = new Set(
        incomingMedia
          .filter((item) => media.includes(item))
          .map((item) => item.id),
      );
      const acceptedBg = incomingBg.filter((bg) => customBg.includes(bg));
      const acceptedAud = incomingAud.filter((aud) => customAud.includes(aud));

      if (override) {
        await Promise.all([
          clearStore("manuscripts"),
          clearStore(LEGACY_MANUSCRIPT_STORE),
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
          (read, total) => onProgress?.(0.1 + 0.7 * (total ? read / total : 1)),
        );
      } else {
        const acceptedMediaItems = media.filter((m) => acceptedMedia.has(m.id));
        const total =
          acceptedMediaItems.length + acceptedBg.length + acceptedAud.length;
        let done = 0;
        const step = () =>
          onProgress?.(0.1 + 0.7 * (done / Math.max(1, total)));

        for (const item of acceptedMediaItems) {
          const madeThumb = await ingestLegacyDataUrl(
            item,
            item.id,
            item.kind === "image",
          );
          if (madeThumb) item.hasThumb = true;
          done += 1;
          step();
        }
        for (const bg of acceptedBg) {
          if (!bg.blobId && bg.dataUrl) bg.blobId = bg.id;
          await ingestLegacyDataUrl(
            bg,
            bg.blobId || bg.id,
            bg.type === "image",
          );
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
        manuscripts,
        scriptures,
        media,
        themes,
        backgrounds: [...BACKGROUNDS, ...customBg],
        audio: [...DEFAULT_AUDIO, ...customAud],
        prefs,
      });

      const puts: { store: StoreName; value: { id: string } }[] = [
        ...manuscripts.map((value) => ({
          store: "manuscripts" as StoreName,
          value,
        })),
        ...scriptures.map((value) => ({
          store: "scriptures" as StoreName,
          value,
        })),
        ...media.map((value) => ({ store: "media" as StoreName, value })),
        ...themes.map((value) => ({ store: "themes" as StoreName, value })),
        ...customBg.map((value) => ({
          store: "backgrounds" as StoreName,
          value,
        })),
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
    set({
      resetting: true,
      overlay: null,
      pendingUpload: null,
      presentation: null,
    });
    const startedAt = Date.now();
    let keptTotal = 0;
    try {
      // Worked out before the stores are cleared: manuscripts and custom themes
      // the user registered as "keep on reset" carry their own settings over,
      // with references to anything the reset wipes pointed at the defaults.
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

      await Promise.all([
        clearStore("manuscripts"),
        clearStore(LEGACY_MANUSCRIPT_STORE),
        clearStore("scriptures"),
        clearStore("media"),
        clearStore("themes"),
        clearStore("backgrounds"),
        clearStore("audio"),
        clearStore("prefs"),
        clearStore("bible"),
        clearStore("files"),
      ]);
      for (const manuscript of survivors.manuscripts)
        await saveRecord("manuscripts", manuscript);
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
      const elapsed = Date.now() - startedAt;
      if (elapsed < 900)
        await new Promise((resolve) => setTimeout(resolve, 900 - elapsed));
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
