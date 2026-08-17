import { z } from "zod";

/**
 * Validation for imported backups. External data is never trusted: every record
 * is parsed here, and the schemas are shaped so the inferred types line up with
 * the domain types in `types.ts` (see the `Imported*` exports below). Enum-typed
 * fields (align, animation, fit…) use `.catch()` so a single malformed value
 * degrades to a safe default instead of rejecting the whole import, and
 * `.passthrough()` preserves keys newer than this schema.
 */

const alignSchema = z.enum(["left", "center", "right"]);

const animationSchema = z
  .enum([
    "fade",
    "crossfade",
    "dissolve",
    "zoom",
    "slide-left",
    "slide-right",
    "slide-up",
    "slide-down",
  ])
  .optional()
  .catch(undefined);

const fitSchema = z.enum(["contain", "cover", "fill"]);

const rotateSchema = z.union([
  z.literal(0),
  z.literal(90),
  z.literal(180),
  z.literal(270),
]);

/** Shared shape of the text-style fields (themes, deck documents, slides). */
const textStyleShape = {
  fontFamily: z.string().optional(),
  fontSize: z.number().optional(),
  fontWeight: z.number().optional(),
  align: alignSchema.optional().catch(undefined),
  color: z.string().optional(),
  lineHeight: z.number().optional(),
  letterSpacing: z.number().optional(),
  uppercase: z.boolean().optional(),
  textShadow: z.string().optional(),
};

const textStyleSchema = z.object(textStyleShape).passthrough();

/** Shared shape of the color-adjustment fields (images and videos). */
const adjustmentsShape = {
  brightness: z.number().optional(),
  contrast: z.number().optional(),
  saturation: z.number().optional(),
  grayscale: z.number().optional(),
  sepia: z.number().optional(),
  blur: z.number().optional(),
};

const imageSettingsSchema = z
  .object({
    ...adjustmentsShape,
    rotate: rotateSchema.optional(),
    flipH: z.boolean().optional(),
    flipV: z.boolean().optional(),
    fit: fitSchema.optional(),
    scrim: z.boolean().optional(),
  })
  .passthrough();

const slideOverridesSchema = z
  .object({
    ...textStyleShape,
    backgroundId: z.string().optional(),
    audioId: z.string().optional(),
    animation: animationSchema,
    scrim: z.boolean().optional(),
    backgroundImage: imageSettingsSchema.optional().catch(undefined),
  })
  .passthrough();

const videoSettingsSchema = z
  .object({
    ...adjustmentsShape,
    trimStart: z.number().optional(),
    trimEnd: z.number().nullable().optional(),
    volume: z.number().optional(),
    muted: z.boolean().optional(),
    loop: z.boolean().optional(),
    playbackRate: z.number().optional(),
    fit: fitSchema.optional(),
  })
  .passthrough();

const slideFrameSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

const lineOverridesSchema = z.record(textStyleSchema);

const slideMediaSchema = z
  .object({
    id: z.string().optional(),
    kind: z.enum(["image", "video"]),
    mediaId: z.string(),
    source: z.enum(["media", "background"]).optional().catch(undefined),
    frame: slideFrameSchema.optional(),
    radius: z.number().optional(),
    opacity: z.number().optional(),
    image: imageSettingsSchema.optional().catch(undefined),
    video: videoSettingsSchema.optional().catch(undefined),
  })
  .passthrough();

const slideTextBoxSchema = z
  .object({
    id: z.string().optional(),
    frame: slideFrameSchema.optional(),
    lines: z.array(z.string()).optional(),
    verticalAlign: z
      .enum(["top", "middle", "bottom"])
      .optional()
      .catch(undefined),
    style: textStyleSchema.optional(),
    lineOverrides: lineOverridesSchema.optional().catch(undefined),
  })
  .passthrough();

const slideSchema = z
  .object({
    id: z.string().optional(),
    type: z.string().optional(),
    label: z.string().optional(),
    lines: z.array(z.string()).optional(),
    overrides: slideOverridesSchema.optional(),
    media: z.array(slideMediaSchema).optional().catch(undefined),
    textBoxes: z.array(slideTextBoxSchema).optional().catch(undefined),
    notes: z.string().optional(),
  })
  .passthrough();

/**
 * Backups written before the songs module became manuscripts carry
 * `artist`/`category`/`lyrics`; both spellings are accepted and reconciled by
 * the importer.
 */
export const manuscriptSchema = z
  .object({
    id: z.string().optional(),
    title: z.string(),
    author: z.string().optional(),
    collection: z.string().optional(),
    body: z.string().optional(),
    artist: z.string().optional(),
    category: z.string().optional(),
    lyrics: z.string().optional(),
    slides: z.array(slideSchema).optional(),
    maxLines: z.number().optional(),
    format: z.enum(["song", "sermon"]).optional().catch(undefined),
    defaultThemeId: z.string().optional().default("classic"),
    defaultBackgroundId: z.string().optional(),
    defaultBackgroundImage: imageSettingsSchema.optional().catch(undefined),
    defaultAudioId: z.string().nullable().optional(),
    animation: animationSchema,
    autoPlay: z.boolean().optional(),
    slideDurationSeconds: z.number().optional(),
    style: textStyleSchema.optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    deleted: z.boolean().optional(),
    builtIn: z.boolean().optional(),
    pinned: z.boolean().optional(),
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
    align: alignSchema.catch("center"),
    lineHeight: z.number(),
    letterSpacing: z.number(),
    fontSize: z.number(),
    uppercase: z.boolean(),
    textShadow: z.string(),
    backgroundId: z.string(),
    animation: animationSchema,
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
    image: imageSettingsSchema.optional().catch(undefined),
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
    defaultBackgroundImage: imageSettingsSchema.optional().catch(undefined),
    defaultAudioId: z.string().nullable().optional(),
    animation: animationSchema,
    style: textStyleSchema.optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    deleted: z.boolean().optional(),
    quick: z.boolean().optional(),
    pinned: z.boolean().optional(),
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
    image: imageSettingsSchema.optional().catch(undefined),
    video: videoSettingsSchema.optional().catch(undefined),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    pinned: z.boolean().optional(),
  })
  .passthrough();

export const dataFileSchema = z.object({
  version: z.number().optional(),
  exportedAt: z.string().optional(),
  manuscripts: z.array(manuscriptSchema).optional(),
  /** Pre-rename backups shipped the same records under "songs". */
  songs: z.array(manuscriptSchema).optional(),
  scriptures: z.array(scriptureSchema).optional(),
  media: z.array(mediaSchema).optional(),
  themes: z.array(themeSchema).optional(),
  backgrounds: z.array(backgroundSchema).optional(),
  audio: z.array(audioSchema).optional(),
  prefs: z.record(z.unknown()).optional(),
});

export type DataFile = z.infer<typeof dataFileSchema>;

export type ImportedSlide = z.infer<typeof slideSchema>;
export type ImportedManuscript = z.infer<typeof manuscriptSchema>;
export type ImportedScripture = z.infer<typeof scriptureSchema>;
export type ImportedMedia = z.infer<typeof mediaSchema>;
export type ImportedTheme = z.infer<typeof themeSchema>;
export type ImportedBackground = z.infer<typeof backgroundSchema>;
export type ImportedAudio = z.infer<typeof audioSchema>;
