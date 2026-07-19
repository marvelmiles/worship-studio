/** Compatibility layer over the UI theme system.
 *
 *  The single source of truth for the app's look is src/theme/uiTheme.ts,
 *  served to components through the useUITheme() hook (src/theme/ThemeProvider).
 *  These re-exports keep older modules and module-level style constants working;
 *  new or touched components should call useUITheme() instead. */
import { midnightTheme } from "./uiTheme";

export { fade, chartColor } from "./uiTheme";
export type { UITheme, UIThemeColors } from "./uiTheme";
export { midnightTheme } from "./uiTheme";

export const colors = midnightTheme.colors;

/** Frosted glass surface: translucent indigo over the ambient gradient,
 *  heavy blur + saturation, light top edge highlight. */
export const glass = midnightTheme.glass;

export const UI = midnightTheme.fonts.ui;
export const DISPLAY = midnightTheme.fonts.display;

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
