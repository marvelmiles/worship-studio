import type { AudioItem, Background, MediaItem } from "../types";
import type { BackupSource } from "./backupPayload";
import {
  PREFS_RECORD_ID,
  selectionFrom,
  type BackupRecordRef,
  type BackupSelection,
} from "./shareSelection";
import { formatDuration } from "./media";
import { formatBytes } from "./storageStats";

export type ShareTabId =
  | "manuscripts"
  | "passages"
  | "images"
  | "videos"
  | "audio"
  | "colours"
  | "themes"
  | "overlays"
  | "settings";

/** How a shareable thing is shown: its own picture where it has one. */
export type SharePreview =
  | { kind: "media"; item: MediaItem }
  | { kind: "background"; background: Background }
  | { kind: "audio"; item: AudioItem }
  | { kind: "text" };

export interface ShareItem {
  /** Unique across the catalog, so one selection can span every tab. */
  key: string;
  name: string;
  detail: string;
  createdAt: string;
  updatedAt: string;
  bytes: number;
  /** Every record this one thing is made of, wherever it lives. */
  records: BackupRecordRef[];
  preview: SharePreview;
}

export interface ShareTab {
  id: ShareTabId;
  label: string;
  items: ShareItem[];
}

const EPOCH = "";

const stamp = (value?: string): string => value ?? EPOCH;

/* A picture or clip can be in the media library and attached as a background at
   once. It is one thing to the person choosing, so it is listed once and
   carries every record that names its file. */
const fileKeyOfBackground = (background: Background): string =>
  background.blobId ?? background.mediaId ?? background.id;

const detailOf = (parts: (string | undefined)[]): string =>
  parts.filter(Boolean).join(" · ");

const mediaDetail = (item: MediaItem): string =>
  detailOf([
    item.width && item.height ? `${item.width}×${item.height}` : undefined,
    item.size ? formatBytes(item.size) : undefined,
    item.duration !== undefined ? formatDuration(item.duration) : undefined,
  ]);

interface FileGroup {
  key: string;
  name: string;
  detail: string;
  createdAt: string;
  updatedAt: string;
  bytes: number;
  records: BackupRecordRef[];
  preview: SharePreview;
}

/**
 * Every picture or clip of one kind, wherever it lives: the media library, the
 * asset library, or both at once.
 */
const fileItems = (
  source: BackupSource,
  kind: MediaItem["kind"],
): ShareItem[] => {
  const groups = new Map<string, FileGroup>();

  for (const item of source.media) {
    if (item.kind !== kind) continue;
    groups.set(item.id, {
      key: item.id,
      name: item.name,
      detail: mediaDetail(item),
      createdAt: stamp(item.createdAt),
      updatedAt: stamp(item.updatedAt ?? item.createdAt),
      bytes: item.size ?? 0,
      records: [{ collection: "media", id: item.id }],
      preview: { kind: "media", item },
    });
  }

  const wantedType = kind === "image" ? "image" : "video";
  for (const background of source.backgrounds) {
    if (background.builtIn || background.type !== wantedType) continue;
    const fileKey = fileKeyOfBackground(background);
    const record: BackupRecordRef = {
      collection: "backgrounds",
      id: background.id,
    };
    const existing = groups.get(fileKey);
    if (existing) {
      existing.records.push(record);
      continue;
    }
    groups.set(fileKey, {
      key: fileKey,
      name: background.name,
      detail: detailOf([
        "Asset library",
        background.size ? formatBytes(background.size) : undefined,
      ]),
      createdAt: stamp(background.createdAt),
      updatedAt: stamp(background.createdAt),
      bytes: background.size ?? 0,
      records: [record],
      preview: { kind: "background", background },
    });
  }

  return [...groups.values()];
};

const audioItems = (source: BackupSource): ShareItem[] =>
  source.audio
    .filter((item) => !item.builtIn)
    .map((item) => ({
      key: item.id,
      name: item.name,
      detail: detailOf([
        item.duration !== undefined ? formatDuration(item.duration) : undefined,
        item.size ? formatBytes(item.size) : undefined,
        item.mediaId ? "From a clip" : undefined,
      ]),
      createdAt: stamp(item.createdAt),
      updatedAt: stamp(item.updatedAt ?? item.createdAt),
      bytes: item.size ?? 0,
      records: [{ collection: "audio", id: item.id }],
      preview: { kind: "audio", item },
    }));

const colourItems = (source: BackupSource): ShareItem[] =>
  source.backgrounds
    .filter(
      (background) =>
        !background.builtIn &&
        (background.type === "gradient" || background.type === "solid"),
    )
    .map((background) => ({
      key: background.id,
      name: background.name,
      detail: background.type === "gradient" ? "Gradient" : "Solid colour",
      createdAt: stamp(background.createdAt),
      updatedAt: stamp(background.createdAt),
      bytes: 0,
      records: [{ collection: "backgrounds", id: background.id }],
      preview: { kind: "background", background },
    }));

/** Everything this library can hand to another device, tab by tab. */
export const shareCatalog = (source: BackupSource): ShareTab[] => [
  {
    id: "manuscripts",
    label: "Manuscripts",
    items: source.manuscripts
      .filter((doc) => !doc.deleted)
      .map((doc) => ({
        key: doc.id,
        name: doc.title,
        detail: detailOf([
          doc.author,
          `${doc.slides?.length ?? 0} slide${doc.slides?.length === 1 ? "" : "s"}`,
        ]),
        createdAt: stamp(doc.createdAt),
        updatedAt: stamp(doc.updatedAt),
        bytes: 0,
        records: [{ collection: "manuscripts", id: doc.id }],
        preview: { kind: "text" },
      })),
  },
  {
    id: "passages",
    label: "Passages",
    items: source.scriptures
      .filter((passage) => !passage.quick && !passage.deleted)
      .map((passage) => ({
        key: passage.id,
        name: passage.title,
        detail: detailOf([
          passage.version,
          `${passage.verses?.length ?? 0} verse${passage.verses?.length === 1 ? "" : "s"}`,
        ]),
        createdAt: stamp(passage.createdAt),
        updatedAt: stamp(passage.updatedAt),
        bytes: 0,
        records: [{ collection: "scriptures", id: passage.id }],
        preview: { kind: "text" },
      })),
  },
  { id: "images", label: "Images", items: fileItems(source, "image") },
  { id: "videos", label: "Videos", items: fileItems(source, "video") },
  { id: "audio", label: "Audio", items: audioItems(source) },
  { id: "colours", label: "Colours", items: colourItems(source) },
  {
    id: "themes",
    label: "Themes",
    items: source.themes.map((theme) => ({
      key: theme.id,
      name: theme.name,
      detail: theme.builtIn ? "Built in" : "Custom",
      createdAt: stamp(theme.createdAt),
      updatedAt: stamp(theme.updatedAt ?? theme.createdAt),
      bytes: 0,
      records: [{ collection: "themes", id: theme.id }],
      preview: { kind: "text" },
    })),
  },
  {
    id: "overlays",
    label: "Saved overlays",
    items: source.overlayPresets.map((preset) => ({
      key: preset.id,
      name: preset.name,
      detail: "Broadcast overlay",
      createdAt: preset.createdAt,
      updatedAt: preset.updatedAt,
      bytes: 0,
      records: [{ collection: "overlayPresets", id: preset.id }],
      preview: { kind: "text" },
    })),
  },
  {
    id: "settings",
    label: "Settings",
    items: [
      {
        key: PREFS_RECORD_ID,
        name: "App settings",
        detail: "Playback, display and defaults",
        createdAt: EPOCH,
        updatedAt: EPOCH,
        bytes: 0,
        records: [{ collection: "prefs", id: PREFS_RECORD_ID }],
        preview: { kind: "text" },
      },
    ],
  },
];

/** What a person has ticked, across every tab at once. */
export type PickedShareItems = Readonly<Record<string, ShareItem>>;

/** Unique per tab, so two tabs can never tick each other's items. */
export const pickKey = (tab: ShareTabId, item: ShareItem): string =>
  `${tab}:${item.key}`;

export const pickedSelection = (picked: PickedShareItems): BackupSelection =>
  selectionFrom(Object.values(picked).flatMap((item) => item.records));

export const pickedCount = (picked: PickedShareItems): number =>
  Object.keys(picked).length;

/** The records behind one library item, so a card can share it on its own. */
export const recordsForMedia = (
  source: BackupSource,
  mediaId: string,
): BackupRecordRef[] => {
  const item = source.media.find((entry) => entry.id === mediaId);
  if (!item) return [];
  const catalogue = fileItems(source, item.kind);
  return (
    catalogue.find((entry) => entry.key === mediaId)?.records ?? [
      { collection: "media", id: mediaId },
    ]
  );
};
