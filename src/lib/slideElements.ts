import type { ManuscriptFormat } from "../types";

export interface SlideElementCapabilities {
  images: boolean;
  videos: boolean;
  textBoxes: boolean;
}

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

export const manuscriptSlideElements = (
  format: ManuscriptFormat,
): SlideElementCapabilities =>
  format === "sermon" ? SERMON_ELEMENTS : NOTHING_PLACED;

export const allowsAnySlideElement = (
  capabilities: SlideElementCapabilities,
): boolean =>
  capabilities.images || capabilities.videos || capabilities.textBoxes;

export const slideElementsTitle = (
  capabilities: SlideElementCapabilities,
): string => {
  const { images, videos, textBoxes } = capabilities;
  if (textBoxes) return "Slide Elements";
  if (images && videos) return "Images & Videos";
  if (images) return "Images";
  if (videos) return "Videos";
  return "Slide Elements";
};
