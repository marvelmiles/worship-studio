import { z } from "zod";
import type {
  AudioSettings,
  ImageSettings,
  SlideDeckDoc,
  SlideOverrides,
  VideoSettings,
} from "../types";
import {
  audioSettingsSchema,
  imageSettingsSchema,
  videoSettingsSchema,
} from "./schema";
import routes, { isRoutePath } from "../routes";

/**
 * One place an asset is used: a manuscript, a passage or a single slide.
 *
 * Settings edited for a usage stay with that one place. The asset in the
 * library keeps the settings it was saved with, so the same picture, clip or
 * sound can look and sound different wherever it is used, and editing it in the
 * asset library or its own module still sets what later uses start from.
 */

export type AssetUsageKind = "image" | "video" | "audio";

/** The asset being tuned, and the settings this one place starts from. */
export type AssetUsageSubject =
  | { kind: "image"; settings: ImageSettings; defaults: ImageSettings }
  | { kind: "video"; settings: VideoSettings; defaults: VideoSettings }
  | { kind: "audio"; settings: AudioSettings; defaults: AudioSettings };

/**
 * What a picker hands up when its pencil is pressed: the background or sound to
 * open, which the place also ends up using once the settings come back.
 */
export type AssetUsageRequest = AssetUsageSubject & { assetId: string };

/** The one place the settings belong to. */
export interface AssetUsagePlace {
  /** How the place reads in a sentence, such as "this slide". */
  label: string;
  /** The slide the settings belong to, or null for the document itself. */
  slideId: string | null;
  /** The page the editor's back arrow returns to. */
  returnTo: string;
}

export type AssetUsageEdit = AssetUsageRequest & AssetUsagePlace;

const editShape = {
  assetId: z.string().min(1),
  label: z.string().min(1),
  slideId: z.string().nullable(),
  returnTo: z.string().refine(isRoutePath),
};

export const assetUsageEditSchema = z.discriminatedUnion("kind", [
  z.object({
    ...editShape,
    kind: z.literal("image"),
    settings: imageSettingsSchema,
    defaults: imageSettingsSchema,
  }),
  z.object({
    ...editShape,
    kind: z.literal("video"),
    settings: videoSettingsSchema,
    defaults: videoSettingsSchema,
  }),
  z.object({
    ...editShape,
    kind: z.literal("audio"),
    settings: audioSettingsSchema,
    defaults: audioSettingsSchema,
  }),
]);

export const assetUsagePath = (edit: AssetUsageEdit): string =>
  routes.assetUsage(
    edit.kind === "audio" ? "sound" : "background",
    edit.assetId,
  );

export const assetUsageNote = (label: string, kind: AssetUsageKind): string => {
  const noun =
    kind === "image" ? "picture" : kind === "video" ? "clip" : "sound";
  return `These changes apply to ${label} only. The ${noun} in your library is left as it is, so everywhere else it is used stays the way it is.`;
};

/* The asset comes back with its settings: editing a picture, clip or sound for
   a place is also choosing it there, the way the pickers have always read. */
export const assetUsageSlideChanges = (
  edit: AssetUsageEdit,
): Partial<SlideOverrides> => {
  if (edit.kind === "image")
    return { backgroundId: edit.assetId, backgroundImage: edit.settings };
  if (edit.kind === "video")
    return { backgroundId: edit.assetId, backgroundVideo: edit.settings };
  return { audioId: edit.assetId, audioSettings: edit.settings };
};

export const assetUsageDocumentChanges = (
  edit: AssetUsageEdit,
): Partial<SlideDeckDoc> => {
  if (edit.kind === "image")
    return {
      defaultBackgroundId: edit.assetId,
      defaultBackgroundImage: edit.settings,
    };
  if (edit.kind === "video")
    return {
      defaultBackgroundId: edit.assetId,
      defaultBackgroundVideo: edit.settings,
    };
  return { defaultAudioId: edit.assetId, defaultAudioSettings: edit.settings };
};
