import { z } from "zod";

const slideSchema = z
  .object({
    id: z.string().optional(),
    type: z.string().optional(),
    label: z.string().optional(),
    lines: z.array(z.string()).optional(),
    overrides: z.record(z.unknown()).optional(),
    notes: z.string().optional(),
  })
  .passthrough();

export const songSchema = z
  .object({
    id: z.string().optional(),
    title: z.string(),
    artist: z.string().optional(),
    category: z.string().optional(),
    lyrics: z.string().optional().default(""),
    slides: z.array(slideSchema).optional(),
    maxLines: z.number().optional(),
    defaultThemeId: z.string().optional().default("classic"),
    defaultBackgroundId: z.string().optional(),
    defaultAudioId: z.string().nullable().optional(),
    animation: z.string().optional(),
    autoPlay: z.boolean().optional(),
    slideDurationSeconds: z.number().optional(),
    style: z.record(z.unknown()).optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    deleted: z.boolean().optional(),
    builtIn: z.boolean().optional(),
  })
  .passthrough();

const themeSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    builtIn: z.boolean().optional(),
    fontFamily: z.string(),
    fontWeight: z.number(),
    color: z.string(),
    align: z.enum(["left", "center", "right"]),
    lineHeight: z.number(),
    letterSpacing: z.number(),
    fontSize: z.number(),
    uppercase: z.boolean(),
    textShadow: z.string(),
    backgroundId: z.string(),
    animation: z.string().optional(),
  })
  .passthrough();

const backgroundSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    category: z.string().optional(),
    type: z.enum(["gradient", "solid", "image"]),
    css: z.string().optional(),
    color: z.string().optional(),
    dataUrl: z.string().optional(),
    blobId: z.string().optional(),
    size: z.number().optional(),
    light: z.boolean().optional(),
    builtIn: z.boolean().optional(),
  })
  .passthrough();

const audioSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    dataUrl: z.string().optional(),
    blobId: z.string().optional(),
    size: z.number().optional(),
    builtIn: z.boolean().optional(),
  })
  .passthrough();

export const scriptureSchema = z
  .object({
    id: z.string().optional(),
    title: z.string(),
    version: z.string(),
    range: z.object({
      bookId: z.number(),
      bookName: z.string(),
      chapter: z.number(),
      verseStart: z.number(),
      verseEnd: z.number(),
    }),
    verses: z.array(z.object({ v: z.number(), t: z.string() })),
    versesPerSlide: z.number().optional(),
    showVerseNumbers: z.boolean().optional(),
    showReference: z.boolean().optional(),
    slides: z.array(slideSchema).optional(),
    defaultThemeId: z.string().optional().default("scripture"),
    defaultBackgroundId: z.string().optional(),
    defaultAudioId: z.string().nullable().optional(),
    animation: z.string().optional(),
    style: z.record(z.unknown()).optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    deleted: z.boolean().optional(),
    quick: z.boolean().optional(),
  })
  .passthrough();

export const mediaSchema = z
  .object({
    id: z.string().optional(),
    kind: z.enum(["image", "video"]),
    name: z.string(),
    /** Present only in legacy (v3) exports; newer backups ship blobs in the zip. */
    dataUrl: z.string().optional(),
    mimeType: z.string().optional(),
    size: z.number().optional(),
    duration: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    hasThumb: z.boolean().optional(),
    image: z.record(z.unknown()).optional(),
    video: z.record(z.unknown()).optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export const dataFileSchema = z.object({
  version: z.number().optional(),
  exportedAt: z.string().optional(),
  songs: z.array(songSchema).optional(),
  scriptures: z.array(scriptureSchema).optional(),
  media: z.array(mediaSchema).optional(),
  themes: z.array(themeSchema).optional(),
  backgrounds: z.array(backgroundSchema).optional(),
  audio: z.array(audioSchema).optional(),
  prefs: z.record(z.unknown()).optional(),
});

export type DataFile = z.infer<typeof dataFileSchema>;
