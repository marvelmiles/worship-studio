import type {
  Background,
  ImageSettings,
  Manuscript,
  MediaItem,
  ScripturePassage,
  Slide,
} from "../types";
import { DEFAULT_BIBLE_VERSION, isBibleVersion } from "../data/bibleBooks";
import { DEFAULT_COLLECTION } from "../data/collections";
import { parseManuscriptSlides } from "../lib/parser";
import { resolveManuscriptFormat } from "../lib/manuscript/format";
import { normalizeSlideMedia } from "../lib/slideMedia";
import { normalizeSlideTextBox } from "../lib/slideTextBox";
import { now, uid } from "../lib/id";
import {
  DEFAULT_BACKGROUND_IMAGE_SETTINGS,
  DEFAULT_IMAGE_SETTINGS,
  DEFAULT_VIDEO_SETTINGS,
} from "../lib/media";
import type {
  ImportedBackground,
  ImportedManuscript,
  ImportedMedia,
  ImportedScripture,
  ImportedSlide,
} from "../lib/schema";

const DEFAULT_MAX_LINES = 6;

const normalizeBackgroundImage = (
  settings: Partial<ImageSettings> | undefined,
): ImageSettings | undefined =>
  settings ? { ...DEFAULT_BACKGROUND_IMAGE_SETTINGS, ...settings } : undefined;

const normalizeSlide = (slide: ImportedSlide): Slide => {
  const { backgroundImage, ...overrides } = slide.overrides ?? {};
  return {
    ...slide,
    id: slide.id || uid(),
    type: slide.type ?? "verse",
    label: slide.label ?? "",
    lines: slide.lines ?? [],
    overrides: {
      ...overrides,
      backgroundImage: normalizeBackgroundImage(backgroundImage),
    },
    media: slide.media?.map(normalizeSlideMedia),
    textBoxes: slide.textBoxes?.map(normalizeSlideTextBox),
    notes: slide.notes ?? "",
  };
};

export const normalizeImportedManuscript = (
  entry: ImportedManuscript,
): Manuscript => {
  const timestamp = now();
  const body = entry.body ?? "";
  return {
    ...entry,
    id: entry.id || uid(),
    body,
    defaultBackgroundImage: normalizeBackgroundImage(
      entry.defaultBackgroundImage,
    ),
    collection: entry.collection ?? DEFAULT_COLLECTION,
    createdAt: entry.createdAt ?? timestamp,
    updatedAt: entry.updatedAt ?? timestamp,
    deleted: Boolean(entry.deleted),
    slides: entry.slides?.length
      ? entry.slides.map(normalizeSlide)
      : parseManuscriptSlides(body, {
          maxLines: entry.maxLines ?? DEFAULT_MAX_LINES,
          format: resolveManuscriptFormat({
            format: entry.format,
            collection: entry.collection,
          }),
        }),
  };
};

export const normalizeImportedScripture = (
  entry: ImportedScripture,
): ScripturePassage => {
  const timestamp = now();
  return {
    ...entry,
    id: entry.id || uid(),
    defaultBackgroundImage: normalizeBackgroundImage(
      entry.defaultBackgroundImage,
    ),
    version: isBibleVersion(entry.version)
      ? entry.version
      : DEFAULT_BIBLE_VERSION,
    versesPerSlide: entry.versesPerSlide ?? 1,
    showVerseNumbers: entry.showVerseNumbers ?? true,
    showReference: entry.showReference ?? true,
    slides: entry.slides ? entry.slides.map(normalizeSlide) : [],
    createdAt: entry.createdAt ?? timestamp,
    updatedAt: entry.updatedAt ?? timestamp,
    deleted: Boolean(entry.deleted),
    quick: undefined,
  };
};

export const normalizeImportedMedia = (entry: ImportedMedia): MediaItem => {
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
};

export const normalizeImportedBackground = (
  entry: ImportedBackground,
): Background => ({
  ...entry,
  category: entry.category ?? "Custom",
  image: normalizeBackgroundImage(entry.image),
});
