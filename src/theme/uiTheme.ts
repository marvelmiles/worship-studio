import type { CSSProperties } from "react";

/** Returns the color at the given opacity, e.g. fade(theme.colors.accent, 0.2). */
export function fade(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Blends two hex colors. amount 0 → a, amount 1 → b. Used to derive legible
 *  light text tints from a saturated palette color. */
export function mix(a: string, b: string, amount: number): string {
  const channels = (hex: string) =>
    [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const [ra, ga, ba] = channels(a);
  const [rb, gb, bb] = channels(b);
  const blend = (x: number, y: number) =>
    Math.round(x + (y - x) * amount)
      .toString(16)
      .padStart(2, "0");
  return `#${blend(ra, rb)}${blend(ga, gb)}${blend(ba, bb)}`;
}

/** A semantic (danger/warning/info/success) surface derived entirely from a
 *  single palette color, so feedback UI tracks the theme from one source. */
export interface FeedbackTone {
  /** Solid palette color: icon glyphs, badge fills. */
  base: string;
  /** Translucent tinted surface (pairs with a backdrop blur). */
  bg: string;
  /** Translucent hairline border for the surface. */
  border: string;
  /** Pale, legible text/icon color for use on `bg`. */
  text: string;
}

/** Builds a FeedbackTone from a palette color (e.g. theme.colors.danger). */
export function feedbackTone(hex: string): FeedbackTone {
  return {
    base: hex,
    bg: fade(hex, 0.15),
    border: fade(hex, 0.42),
    text: mix(hex, "#ffffff", 0.72),
  };
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
  /** Text sitting on the accent color. */
  onAccent: string;
  text: string;
  sub: string;
  dim: string;
  danger: string;
  success: string;
  /** Cautionary state (approaching a limit, degraded but not failing). */
  warning: string;
  /** Neutral, informational emphasis. Stays in the accent (blue) family. */
  info: string;
}

export interface UITheme {
  name: string;
  colors: UIThemeColors;
  fonts: { ui: string; display: string };
  /** Frosted glass card surface. */
  glass: CSSProperties;
  fills: {
    /** Horizontal accent fill for progress / usage bars. */
    accentBar: string;
    /** Large hero CTA card fill (dashboard "New Song"). */
    ctaCard: string;
    successBar: string;
    dangerBar: string;
  };
  controls: {
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
    cta: string;
    overlay: string;
  };
}

const accent = "#2563eb";
const accentSoft = "#3b82f6";

export const studioTheme: UITheme = {
  name: "studio",

  colors: {
    bg: "#18181b",
    bg2: "#202124",

    panel: "rgba(37,38,43,0.85)",
    panelSolid: "#25262b",

    raise: "#2d2f36",

    border: "rgba(255,255,255,0.06)",
    borderStrong: "rgba(255,255,255,0.12)",

    accent,
    accentSoft,

    onAccent: "#ffffff",

    text: "#fafafa",

    sub: "#b3b3b8",

    dim: "#7a7b84",

    danger: "#dc2626",

    success: "#16a34a",

    warning: "#f59e0b",

    info: accentSoft,
  },

  fonts: {
    ui: "Inter, system-ui, sans-serif",
    display: "Inter, system-ui, sans-serif",
  },

  glass: {
    background: "rgba(37,38,43,0.9)",

    backdropFilter: "blur(8px)",

    WebkitBackdropFilter: "blur(8px)",

    border: "1px solid rgba(255,255,255,.06)",

    borderRadius: 10,

    boxShadow: "0 4px 12px rgba(0,0,0,.22)",
  },

  fills: {
    accentBar: accent,

    ctaCard: accent,

    successBar: "#16a34a",

    dangerBar: "#dc2626",
  },

  controls: {
    track: "#35363d",

    toggleOff: "#494b52",

    thumb: "#ffffff",

    thumbRing: accent,
  },

  stage: {
    surface: "#000000",

    overlay: "rgba(18,18,18,.58)",

    overlayStrong: "rgba(18,18,18,.82)",

    border: "rgba(255,255,255,.08)",

    text: "#ffffff",
  },

  charts: [
    "#2563eb",
    "#16a34a",
    "#d97706",
    "#dc2626",
    "#7c3aed",
    "#0891b2",
    "#64748b",
  ],

  shadows: {
    cta: "0 4px 12px rgba(37,99,235,.25)",

    overlay: "0 16px 32px rgba(0,0,0,.35)",
  },
};

/** Cycles through the theme's categorical palette. */
export function chartColor(theme: UITheme, index: number): string {
  return theme.charts[index % theme.charts.length];
}

/** Flattens a theme into `--ws-*` CSS custom properties so static stylesheets
 *  (index.css) and any non-React chrome track the active theme from the same
 *  source of truth. Applied to the document root by the UIThemeProvider. */
export function themeCssVars(theme: UITheme): Record<string, string> {
  const c = theme.colors;
  const { glass } = theme;
  const glassRadius =
    typeof glass.borderRadius === "number"
      ? `${glass.borderRadius}px`
      : String(glass.borderRadius ?? "12px");

  return {
    "--ws-bg": c.bg,
    "--ws-bg2": c.bg2,
    "--ws-panel": c.panel,
    "--ws-panel-solid": c.panelSolid,
    "--ws-raise": c.raise,
    "--ws-border": c.border,
    "--ws-border-strong": c.borderStrong,
    "--ws-accent": c.accent,
    "--ws-accent-soft": c.accentSoft,
    "--ws-on-accent": c.onAccent,
    "--ws-text": c.text,
    "--ws-sub": c.sub,
    "--ws-dim": c.dim,
    "--ws-danger": c.danger,
    "--ws-success": c.success,
    "--ws-warning": c.warning,
    "--ws-info": c.info,
    "--ws-font-ui": theme.fonts.ui,
    "--ws-font-display": theme.fonts.display,
    "--ws-glass-bg": String(glass.background ?? c.panel),
    "--ws-glass-blur": String(glass.backdropFilter ?? "none"),
    "--ws-glass-radius": glassRadius,
    "--ws-glass-shadow": String(glass.boxShadow ?? theme.shadows.overlay),
    "--ws-shadow-overlay": theme.shadows.overlay,
    "--ws-track": theme.controls.track,
    "--ws-thumb": theme.controls.thumb,
    "--ws-thumb-ring": theme.controls.thumbRing,
  };
}
