import type { CSSProperties } from "react";

export const C = {
  bg: "#0b0a0e",
  bg2: "#100f15",
  panel: "rgba(24,22,31,0.62)",
  panelSolid: "#17151f",
  raise: "rgba(40,37,50,0.5)",
  border: "rgba(228,210,180,0.12)",
  borderStrong: "rgba(228,210,180,0.24)",
  gold: "#d8a24a",
  goldSoft: "#ecc784",
  text: "#f3efe6",
  sub: "#a8a194",
  dim: "#6e685e",
  danger: "#e0644f",
} as const;

export const glass: CSSProperties = {
  background: C.panel,
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  border: `1px solid ${C.border}`,
  borderRadius: 16,
};

export const UI = "Outfit, ui-sans-serif, system-ui, sans-serif";
export const DISPLAY = "Fraunces, Georgia, serif";

export const FONTS = [
  "Fraunces",
  "Cormorant Garamond",
  "Playfair Display",
  "Outfit",
  "Sora",
  "Montserrat",
  "Oswald",
  "Georgia",
];

export const CATEGORIES = [
  "Worship",
  "Praise",
  "Hymns",
  "Special Songs",
  "Choir Ministration",
];

export const BREAKPOINTS = { mobile: 640, tablet: 1024 } as const;
