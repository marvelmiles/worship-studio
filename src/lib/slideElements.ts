import type { ManuscriptFormat } from "../types";

/**
 * What a deck lets the writer place on a slide.
 *
 * The document's own layout decides it rather than the editor: lyrics are sung
 * off a clean slide, a sermon is laid out on the page the way a document is,
 * and a passage is the verse with whatever picture or clip sits behind it.
 */
export interface SlideElementCapabilities {
  images: boolean;
  videos: boolean;
  textBoxes: boolean;
}

/** Decks that never said otherwise: pictures and clips, no placed text. */
export const DEFAULT_SLIDE_ELEMENTS: SlideElementCapabilities = {
  images: true,
  videos: true,
  textBoxes: false,
};

const NOTHING_PLACED: SlideElementCapabilities = {
  images: false,
  videos: false,
  textBoxes: false,
};

const SERMON_ELEMENTS: SlideElementCapabilities = {
  images: true,
  videos: false,
  textBoxes: true,
};

/**
 * A song is projected as words on a plain slide, so nothing is placed on it at
 * all. A sermon reads as a document: pictures illustrate a point and text boxes
 * lay it out, while a clip playing under the preaching is not what the format
 * is for.
 */
export const manuscriptSlideElements = (
  format: ManuscriptFormat,
): SlideElementCapabilities =>
  format === "sermon" ? SERMON_ELEMENTS : NOTHING_PLACED;

export const allowsAnySlideElement = (
  capabilities: SlideElementCapabilities,
): boolean =>
  capabilities.images || capabilities.videos || capabilities.textBoxes;

/** Section heading naming exactly what this deck is allowed to place. */
export function slideElementsTitle(
  capabilities: SlideElementCapabilities,
): string {
  const { images, videos, textBoxes } = capabilities;
  if (textBoxes) return "Slide Elements";
  if (images && videos) return "Images & Videos";
  if (images) return "Images";
  if (videos) return "Videos";
  return "Slide Elements";
}
