import type { Slide, SlideDeckDoc } from "../types";
import type { BackupSource } from "./backupPayload";
import { placedMediaSource } from "./slideMedia";
import { contentIdsOf } from "../features/stream/lib/overlayPresets";

/** Where a record lives, which is also where a backup carries it. */
export type BackupCollection =
  | "manuscripts"
  | "scriptures"
  | "media"
  | "themes"
  | "backgrounds"
  | "audio"
  | "overlayPresets"
  | "prefs";

export const BACKUP_COLLECTIONS: readonly BackupCollection[] = [
  "manuscripts",
  "scriptures",
  "media",
  "themes",
  "backgrounds",
  "audio",
  "overlayPresets",
  "prefs",
];

export interface BackupRecordRef {
  collection: BackupCollection;
  id: string;
}

/** Which records travel, by collection. */
export type BackupSelection = Readonly<
  Record<BackupCollection, readonly string[]>
>;

/** The one preferences record, which is either sent or not. */
export const PREFS_RECORD_ID = "app";

export const EMPTY_SELECTION: BackupSelection = {
  manuscripts: [],
  scriptures: [],
  media: [],
  themes: [],
  backgrounds: [],
  audio: [],
  overlayPresets: [],
  prefs: [],
};

export const selectionFrom = (
  refs: readonly BackupRecordRef[],
): BackupSelection => {
  const gathered: Record<BackupCollection, Set<string>> = {
    manuscripts: new Set(),
    scriptures: new Set(),
    media: new Set(),
    themes: new Set(),
    backgrounds: new Set(),
    audio: new Set(),
    overlayPresets: new Set(),
    prefs: new Set(),
  };
  for (const entry of refs) gathered[entry.collection].add(entry.id);
  return {
    manuscripts: [...gathered.manuscripts],
    scriptures: [...gathered.scriptures],
    media: [...gathered.media],
    themes: [...gathered.themes],
    backgrounds: [...gathered.backgrounds],
    audio: [...gathered.audio],
    overlayPresets: [...gathered.overlayPresets],
    prefs: [...gathered.prefs],
  };
};

export const selectionRefs = (selection: BackupSelection): BackupRecordRef[] =>
  BACKUP_COLLECTIONS.flatMap((collection) =>
    selection[collection].map((id) => ({ collection, id })),
  );

export const mergeSelections = (
  ...selections: BackupSelection[]
): BackupSelection =>
  selectionFrom(selections.flatMap((selection) => selectionRefs(selection)));

export const selectionCount = (selection: BackupSelection): number =>
  BACKUP_COLLECTIONS.reduce(
    (total, collection) => total + selection[collection].length,
    0,
  );

export const isSelectionEmpty = (selection: BackupSelection): boolean =>
  selectionCount(selection) === 0;

export const wholeLibrarySelection = (source: BackupSource): BackupSelection =>
  selectionFrom([
    ...source.manuscripts.map((doc) => ref("manuscripts", doc.id)),
    /* Quick-present passages are working state rather than library content;
       the ones a saved overlay stands on are picked up by resolveSelection. */
    ...source.scriptures
      .filter((passage) => !passage.quick)
      .map((passage) => ref("scriptures", passage.id)),
    ...source.media.map((item) => ref("media", item.id)),
    ...source.themes.map((theme) => ref("themes", theme.id)),
    ...source.backgrounds
      .filter((background) => !background.builtIn)
      .map((background) => ref("backgrounds", background.id)),
    ...source.audio
      .filter((item) => !item.builtIn)
      .map((item) => ref("audio", item.id)),
    ...source.overlayPresets.map((preset) => ref("overlayPresets", preset.id)),
    ref("prefs", PREFS_RECORD_ID),
  ]);

const ref = (collection: BackupCollection, id: string): BackupRecordRef => ({
  collection,
  id,
});

const docAssetRefs = (doc: SlideDeckDoc): BackupRecordRef[] => {
  const refs: BackupRecordRef[] = [ref("themes", doc.defaultThemeId)];
  if (doc.defaultBackgroundId)
    refs.push(ref("backgrounds", doc.defaultBackgroundId));
  if (doc.defaultAudioId) refs.push(ref("audio", doc.defaultAudioId));
  for (const slide of doc.slides ?? []) refs.push(...slideAssetRefs(slide));
  return refs;
};

const slideAssetRefs = (slide: Slide): BackupRecordRef[] => {
  const refs: BackupRecordRef[] = [];
  if (slide.overrides?.backgroundId)
    refs.push(ref("backgrounds", slide.overrides.backgroundId));
  if (slide.overrides?.audioId)
    refs.push(ref("audio", slide.overrides.audioId));
  for (const placed of slide.media ?? []) {
    refs.push(
      placedMediaSource(placed) === "background"
        ? ref("backgrounds", placed.mediaId)
        : ref("media", placed.mediaId),
    );
  }
  return refs;
};

/**
 * What a chosen record cannot arrive without: the picture behind a slide, the
 * clip placed on it, the sound a manuscript plays, the passage an overlay
 * shows. Built-in themes, backgrounds and sounds are left behind, since every
 * device already has them, and anything already gone is dropped rather than
 * named in a backup that cannot carry it.
 */
export const resolveSelection = (
  source: BackupSource,
  selection: BackupSelection,
): BackupSelection => {
  const wanted = new Set(selectionRefs(selection).map((entry) => key(entry)));
  const queue = selectionRefs(selection);

  const add = (entry: BackupRecordRef) => {
    if (wanted.has(key(entry))) return;
    wanted.add(key(entry));
    queue.push(entry);
  };

  for (let index = 0; index < queue.length; index += 1) {
    const entry = queue[index];
    for (const needed of dependenciesOf(source, entry)) add(needed);
  }

  return selectionFrom(
    [...wanted].map(fromKey).filter((entry) => holds(source, entry)),
  );
};

const dependenciesOf = (
  source: BackupSource,
  entry: BackupRecordRef,
): BackupRecordRef[] => {
  switch (entry.collection) {
    case "manuscripts": {
      const doc = source.manuscripts.find((item) => item.id === entry.id);
      return doc ? docAssetRefs(doc) : [];
    }
    case "scriptures": {
      const doc = source.scriptures.find((item) => item.id === entry.id);
      return doc ? docAssetRefs(doc) : [];
    }
    case "backgrounds": {
      const background = source.backgrounds.find(
        (item) => item.id === entry.id,
      );
      const mediaId = background?.mediaId ?? background?.blobId;
      return mediaId && source.media.some((item) => item.id === mediaId)
        ? [ref("media", mediaId)]
        : [];
    }
    case "audio": {
      const item = source.audio.find((entry_) => entry_.id === entry.id);
      const mediaId = item?.mediaId;
      return mediaId && source.media.some((entry_) => entry_.id === mediaId)
        ? [ref("media", mediaId)]
        : [];
    }
    case "overlayPresets": {
      const preset = source.overlayPresets.find((item) => item.id === entry.id);
      if (!preset) return [];
      return contentIdsOf([preset.overlay]).flatMap((contentId) =>
        overlayContentRefs(source, contentId),
      );
    }
    default:
      return [];
  }
};

/* A saved overlay names what it shows by id alone, so whichever library holds
   that id is the one that has to travel with it. */
const overlayContentRefs = (
  source: BackupSource,
  contentId: string,
): BackupRecordRef[] => {
  if (source.manuscripts.some((doc) => doc.id === contentId))
    return [ref("manuscripts", contentId)];
  if (source.scriptures.some((doc) => doc.id === contentId))
    return [ref("scriptures", contentId)];
  if (source.media.some((item) => item.id === contentId))
    return [ref("media", contentId)];
  if (source.backgrounds.some((item) => item.id === contentId))
    return [ref("backgrounds", contentId)];
  return [];
};

/** Whether this record is here to send, and worth sending. */
const holds = (source: BackupSource, entry: BackupRecordRef): boolean => {
  switch (entry.collection) {
    case "manuscripts":
      return source.manuscripts.some((item) => item.id === entry.id);
    case "scriptures":
      return source.scriptures.some((item) => item.id === entry.id);
    case "media":
      return source.media.some((item) => item.id === entry.id);
    case "themes":
      return source.themes.some(
        (item) =>
          item.id === entry.id && (!item.builtIn || Boolean(item.updatedAt)),
      );
    case "backgrounds":
      return source.backgrounds.some(
        (item) => item.id === entry.id && !item.builtIn,
      );
    case "audio":
      return source.audio.some((item) => item.id === entry.id && !item.builtIn);
    case "overlayPresets":
      return source.overlayPresets.some((item) => item.id === entry.id);
    case "prefs":
      return entry.id === PREFS_RECORD_ID;
  }
};

const key = (entry: BackupRecordRef): string =>
  `${entry.collection}:${entry.id}`;

const fromKey = (value: string): BackupRecordRef => {
  const divider = value.indexOf(":");
  return {
    collection: value.slice(0, divider) as BackupCollection,
    id: value.slice(divider + 1),
  };
};
