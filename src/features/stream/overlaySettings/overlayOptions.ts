import type { Align } from "../../../types";
import { FONTS } from "../../../data/slideFonts";

export const FONT_OPTIONS = FONTS.map((font) => ({ value: font, label: font }));

export const ALIGN_OPTIONS: { value: Align; label: string }[] = [
  { value: "left", label: "Left" },
  { value: "center", label: "Centre" },
  { value: "right", label: "Right" },
];

export const LAYOUT_OPTIONS = [
  { value: "block", label: "Block over the camera" },
  { value: "slide", label: "The document's own slide" },
];

export const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => ({
  value: String(rate),
  label: `${rate}x`,
}));

export const VIDEO_JUMP_SECONDS = 5;
