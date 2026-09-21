import type {
  AudioItem,
  Background,
  ImageSettings,
  MediaItem,
  SlideDeckDoc,
  Theme,
  VideoSettings,
} from "../types";
import type { BackupSource } from "./backupPayload";
import {
  PREFS_RECORD_ID,
  selectionFrom,
  type BackupRecordRef,
  type BackupSelection,
} from "./shareSelection";
import {
  contentIdsOf,
  isSavedMarquee,
} from "../features/stream/lib/overlayPresets";
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

/** How a shareable thing is shown: whatever it actually looks like. */
export type SharePreview =
  | { kind: "media"; item: MediaItem }
  | {
      kind: "background";
      background: Background;
      settings?: ImageSettings;
      videoSettings?: VideoSettings;
    }
  /** A document or passage, over the background and in the theme it uses. */
  | {
      kind: "deck";
      text: string;
      theme?: Theme;
      background?: Background;
      settings?: ImageSettings;
      videoSettings?: VideoSettings;
    }
  | { kind: "theme"; theme: Theme; background?: Background }
  | { kind: "audio"; item: AudioItem }
  | { kind: "settings" };

export interface ShareItem {
  /** Unique across the catalog, so one selection can span every module. */
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

const backgroundById = (
  source: BackupSource,
  id?: string,
): Background | undefined =>
  id
    ? source.backgrounds.find((background) => background.id === id)
    : undefined;

const themeById = (source: BackupSource, id?: string): Theme | undefined =>
  id ? source.themes.find((theme) => theme.id === id) : undefined;

const mediaById = (source: BackupSource, id: string): MediaItem | undefined =>
  source.media.find((item) => item.id === id);

const EXCERPT_LIMIT = 90;

const excerpt = (value: string): string =>
  value.length > EXCERPT_LIMIT
    ? `${value.slice(0, EXCERPT_LIMIT).trimEnd()}…`
    : value;

/** The first words a document actually shows, so its cover is its own. */
const firstLineOf = (doc: SlideDeckDoc): string => {
  for (const slide of doc.slides ?? []) {
    const line = (slide.lines ?? []).find((text) => text.trim().length > 0);
    if (line) return excerpt(line.trim());
  }
  return doc.title;
};

/** What a document looks like on screen: its background, theme and first line. */
const deckPreview = (source: BackupSource, doc: SlideDeckDoc): SharePreview => {
  const theme = themeById(source, doc.defaultThemeId);
  const background =
    backgroundById(source, doc.defaultBackgroundId) ??
    backgroundById(source, theme?.backgroundId);
  return {
    kind: "deck",
    text: firstLineOf(doc),
    theme,
    background,
    settings: doc.defaultBackgroundImage,
    videoSettings: doc.defaultBackgroundVideo,
  };
};

const audioPreview = (source: BackupSource, item: AudioItem): SharePreview => {
  const clip = item.mediaId ? mediaById(source, item.mediaId) : undefined;
  return clip ? { kind: "media", item: clip } : { kind: "audio", item };
};

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
      preview: audioPreview(source, item),
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

/* A saved overlay is shown by whatever it puts on screen, so its cover is the
   picture, clip or document it points at. */
const overlayPreview = (
  source: BackupSource,
  preset: BackupSource["overlayPresets"][number],
): SharePreview => {
  if (isSavedMarquee(preset.overlay))
    return { kind: "deck", text: excerpt(preset.overlay.text || preset.name) };

  const [contentId] = contentIdsOf([preset.overlay]);
  if (!contentId) return { kind: "deck", text: preset.name };

  const clip = mediaById(source, contentId);
  if (clip) return { kind: "media", item: clip };

  const doc =
    source.manuscripts.find((item) => item.id === contentId) ??
    source.scriptures.find((item) => item.id === contentId);
  if (doc) return deckPreview(source, doc);

  const background = backgroundById(source, contentId);
  return background
    ? { kind: "background", background }
    : { kind: "deck", text: preset.name };
};

/** Everything this library can hand to another device, module by module. */
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
        preview: deckPreview(source, doc),
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
        preview: deckPreview(source, passage),
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
      preview: {
        kind: "theme",
        theme,
        background: backgroundById(source, theme.backgroundId),
      },
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
      preview: overlayPreview(source, preset),
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
        preview: { kind: "settings" },
      },
    ],
  },
];

/** What a person has ticked, across every module at once. */
export type PickedShareItems = Readonly<Record<string, ShareItem>>;

/** Unique per module, so two modules can never tick each other's items. */
export const pickKey = (tab: ShareTabId, item: ShareItem): string =>
  `${tab}:${item.key}`;

export const pickedSelection = (picked: PickedShareItems): BackupSelection =>
  selectionFrom(Object.values(picked).flatMap((item) => item.records));

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
