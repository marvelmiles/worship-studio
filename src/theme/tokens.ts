/** Compatibility layer over the UI theme system.
 *
 *  The single source of truth for the app's look is src/theme/uiTheme.ts,
 *  served to components through the useUITheme() hook (src/theme/ThemeProvider).
 *  These re-exports keep older modules and module-level style constants working;
 *  new or touched components should call useUITheme() instead. */
import { studioTheme } from "./uiTheme";

export { fade, mix, chartColor, feedbackTone } from "./uiTheme";
export type { UITheme, UIThemeColors, FeedbackTone } from "./uiTheme";
export { studioTheme } from "./uiTheme";

export const colors = studioTheme.colors;

/** Frosted glass surface: translucent indigo over the ambient gradient,
 *  heavy blur + saturation, light top edge highlight. */
export const glass = studioTheme.glass;

export const UI = studioTheme.fonts.ui;
export const DISPLAY = studioTheme.fonts.display;

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
