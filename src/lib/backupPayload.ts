import type {
  AudioItem,
  Background,
  Manuscript,
  MediaItem,
  Prefs,
  ScripturePassage,
  Theme,
} from "../types";
import type { StreamOverlayPreset } from "../features/stream/lib/overlayPresets";
import { thumbId } from "./fileStore";
import { now } from "./id";
import { formatCountLabel } from "./formatNumber";
import {
  PREFS_RECORD_ID,
  resolveSelection,
  type BackupSelection,
} from "./shareSelection";

/** The backup file format, versioned on its own so a later reader can migrate. */
export const BACKUP_VERSION = 1;

/** What a backup is built from: the library as it stands in the store. */
export interface BackupSource {
  manuscripts: Manuscript[];
  scriptures: ScripturePassage[];
  media: MediaItem[];
  themes: Theme[];
  backgrounds: Background[];
  audio: AudioItem[];
  overlayPresets: StreamOverlayPreset[];
  prefs: Prefs;
}

export interface BackupPayload {
  version: number;
  exportedAt: string;
  manuscripts?: Manuscript[];
  scriptures?: ScripturePassage[];
  media?: MediaItem[];
  themes?: Theme[];
  backgrounds?: Background[];
  audio?: AudioItem[];
  overlayPresets?: StreamOverlayPreset[];
  prefs?: Prefs;
}

export interface BackupContents {
  payload: BackupPayload;
  /** Every stored file the payload's records need, once each. */
  fileIds: string[];
}

const pick = <T extends { id: string }>(
  items: T[],
  ids: readonly string[],
): T[] => {
  if (ids.length === 0) return [];
  const wanted = new Set(ids);
  return items.filter((item) => wanted.has(item.id));
};

const entry = <T>(key: string, values: T[]): Record<string, T[]> =>
  values.length > 0 ? { [key]: values } : {};

/**
 * Every file the chosen records need, once each. An asset that borrows a media
 * item's file rides along with that item; the rest, including assets whose
 * source media is not travelling, are collected on their own.
 */
const fileIdsFor = (
  media: MediaItem[],
  backgrounds: Background[],
  audio: AudioItem[],
): string[] => {
  const fileIds = new Set<string>();
  const mediaIds = new Set(media.map((item) => item.id));

  for (const item of media) {
    fileIds.add(item.id);
    if (item.hasThumb) fileIds.add(thumbId(item.id));
  }
  for (const background of backgrounds) {
    if (!background.blobId || mediaIds.has(background.blobId)) continue;
    fileIds.add(background.blobId);
    fileIds.add(thumbId(background.blobId));
  }
  for (const item of audio) {
    if (!item.blobId || mediaIds.has(item.blobId)) continue;
    fileIds.add(item.blobId);
  }
  return [...fileIds];
};

/** The records and files behind a selection, with what they need added in. */
export const buildBackup = (
  source: BackupSource,
  selection: BackupSelection,
): BackupContents => {
  const resolved = resolveSelection(source, selection);
  const media = pick(source.media, resolved.media);
  const backgrounds = pick(source.backgrounds, resolved.backgrounds);
  const audio = pick(source.audio, resolved.audio);

  const payload: BackupPayload = {
    version: BACKUP_VERSION,
    exportedAt: now(),
    ...entry("manuscripts", pick(source.manuscripts, resolved.manuscripts)),
    ...entry("scriptures", pick(source.scriptures, resolved.scriptures)),
    ...entry("media", media),
    ...entry("themes", pick(source.themes, resolved.themes)),
    ...entry("backgrounds", backgrounds),
    ...entry("audio", audio),
    ...entry(
      "overlayPresets",
      pick(source.overlayPresets, resolved.overlayPresets),
    ),
    ...(resolved.prefs.includes(PREFS_RECORD_ID)
      ? { prefs: source.prefs }
      : {}),
  };

  return { payload, fileIds: fileIdsFor(media, backgrounds, audio) };
};

/** Roughly how much has to travel, for a person deciding whether to wait. */
export const selectionBytes = (
  source: BackupSource,
  selection: BackupSelection,
): number => {
  const resolved = resolveSelection(source, selection);
  const media = pick(source.media, resolved.media);
  const mediaIds = new Set(media.map((item) => item.id));
  const borrowed = (blobId?: string) => Boolean(blobId && mediaIds.has(blobId));

  return [
    ...media,
    ...pick(source.backgrounds, resolved.backgrounds).filter(
      (background) => !borrowed(background.blobId),
    ),
    ...pick(source.audio, resolved.audio).filter(
      (item) => !borrowed(item.blobId),
    ),
  ].reduce((total, item) => total + (item.size ?? 0), 0);
};

/** "3 manuscripts, 1 video and settings", for saying what is on its way. */
export const describeSelection = (
  source: BackupSource,
  selection: BackupSelection,
): string => {
  const resolved = resolveSelection(source, selection);
  const media = pick(source.media, resolved.media);
  const parts = [
    label(resolved.manuscripts.length, "manuscript"),
    label(resolved.scriptures.length, "passage"),
    label(media.filter((item) => item.kind === "image").length, "image"),
    label(media.filter((item) => item.kind === "video").length, "video"),
    label(resolved.backgrounds.length, "background"),
    label(resolved.audio.length, "sound"),
    label(resolved.themes.length, "theme"),
    label(resolved.overlayPresets.length, "saved overlay"),
    ...(resolved.prefs.length > 0 ? ["settings"] : []),
  ].filter((part): part is string => Boolean(part));

  if (parts.length === 0) return "nothing";
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
};

const label = (count: number, noun: string): string | null =>
  count > 0 ? formatCountLabel(count, noun) : null;
