import type { CSSProperties } from "react";

/** Returns the color at the given opacity, e.g. fade(theme.colors.accent, 0.2). */
export function fade(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export interface UIThemeColors {
  /** App shell background. */
  bg: string;
  /** Slightly raised background (wells, sidebars). */
  bg2: string;
  /** Translucent card surface (pairs with backdrop blur). */
  panel: string;
  /** Opaque card surface (menus, dropdown options). */
  panelSolid: string;
  /** Hover / active raise on top of panels. */
  raise: string;
  border: string;
  borderStrong: string;
  accent: string;
  accentSoft: string;
  /** Deep accent used as the dark stop of CTA gradients. */
  accentDeep: string;
  /** Text sitting on the accent color. */
  onAccent: string;
  text: string;
  sub: string;
  dim: string;
  danger: string;
  success: string;
  warning: string;
}

export interface UITheme {
  name: string;
  colors: UIThemeColors;
  fonts: { ui: string; display: string };
  /** Frosted glass card surface. */
  glass: CSSProperties;
  gradients: {
    /** Horizontal accent fill for progress / usage bars. */
    accentBar: string;
    /** Solid call-to-action fill (primary buttons). */
    cta: string;
    /** Large hero CTA card fill (dashboard "New Song"). */
    ctaCard: string;
    successBar: string;
    dangerBar: string;
  };
  controls: {
    /** Text/select input background. */
    inputBg: string;
    /** Unfilled slider / progress track. */
    track: string;
    /** Toggle background when off. */
    toggleOff: string;
    /** Slider thumb fill + ring. */
    thumb: string;
    thumbRing: string;
  };
  /** Live-stage (projection) chrome. The stage surface stays pure black no
   *  matter the chrome theme so projected content is never tinted. */
  stage: {
    surface: string;
    /** Translucent HUD chip/bar floating over projected content. */
    overlay: string;
    /** Higher-opacity HUD (bottom presenter bar, video controls). */
    overlayStrong: string;
    border: string;
    text: string;
  };
  /** Distinct hues for icon chips, category bars and charts, in
   *  presentation order. Use chartColor(i) to cycle safely. */
  charts: string[];
  shadows: {
    card: string;
    cta: string;
    overlay: string;
  };
}

const accent = "#8b5cf6";
const accentSoft = "#c4b5fd";
const accentDeep = "#7c3aed";

/** The app's built-in look: deep indigo night sky with a violet accent, so the
 *  chrome feels like a starlit sky and the worship content provides the color. */
export const midnightTheme: UITheme = {
  name: "midnight",
  colors: {
    bg: "#07060e",
    bg2: "#0c0a16",
    panel: "rgba(22,19,36,0.5)",
    panelSolid: "#16131f",
    raise: "rgba(91,80,140,0.32)",
    border: "rgba(170,160,255,0.12)",
    borderStrong: "rgba(190,180,255,0.26)",
    accent,
    accentSoft,
    accentDeep,
    onAccent: "#ffffff",
    text: "#f6f4ff",
    sub: "#a3a0b8",
    dim: "#726f8a",
    danger: "#ef4444",
    success: "#22c55e",
    warning: "#fb7185",
  },
  fonts: {
    ui: "Outfit, ui-sans-serif, system-ui, sans-serif",
    display: "Sora, ui-sans-serif, system-ui, sans-serif",
  },
  glass: {
    background: "rgba(22,19,36,0.5)",
    backdropFilter: "blur(22px) saturate(150%)",
    WebkitBackdropFilter: "blur(22px) saturate(150%)",
    border: "1px solid rgba(170,160,255,0.12)",
    borderRadius: 16,
    boxShadow:
      "0 16px 48px rgba(3,0,16,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
  },
  gradients: {
    accentBar: `linear-gradient(90deg,${accent},${accentSoft})`,
    cta: `linear-gradient(135deg,${accentDeep},#9d6bff)`,
    ctaCard: `linear-gradient(120deg,rgba(124,58,237,0.88),rgba(139,92,246,0.5))`,
    successBar: "linear-gradient(90deg,#22c55e,#4ade80)",
    dangerBar: "linear-gradient(90deg,#ef4444,#f87171)",
  },
  controls: {
    inputBg: "rgba(0,0,0,0.28)",
    track: "rgba(255,255,255,0.1)",
    toggleOff: "rgba(255,255,255,0.13)",
    thumb: "#ffffff",
    thumbRing: accentDeep,
  },
  stage: {
    surface: "#000000",
    overlay: "rgba(10,9,14,0.55)",
    overlayStrong: "rgba(10,9,14,0.8)",
    border: "rgba(255,255,255,0.1)",
    text: "#ffffff",
  },
  charts: [
    "#a78bfa", // violet
    "#818cf8", // indigo
    "#4ade80", // green
    "#fbbf24", // amber
    "#f472b6", // pink
    "#c084fc", // purple
    "#38bdf8", // sky
  ],
  shadows: {
    card: "0 16px 48px rgba(3,0,16,0.5)",
    cta: "0 12px 36px rgba(124,58,237,0.35)",
    overlay: "0 24px 80px rgba(3,0,16,0.65)",
  },
};

/** Cycles through the theme's categorical palette. */
export function chartColor(theme: UITheme, index: number): string {
  return theme.charts[index % theme.charts.length];
}
