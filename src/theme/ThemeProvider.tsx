import { createContext, useContext, type ReactNode } from "react";
import { midnightTheme, type UITheme } from "./uiTheme";

const ThemeContext = createContext<UITheme>(midnightTheme);

/** Provides the active UI theme to the tree. Swap `theme` to restyle the
 *  whole app; components read it via useUITheme(). */
export function UIThemeProvider({
  theme = midnightTheme,
  children,
}: {
  theme?: UITheme;
  children: ReactNode;
}) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

/** The app's UI theme (colors, fonts, gradients, control tokens). Every
 *  component that styles chrome should read from this hook instead of
 *  hardcoding colors, so themes stay swappable and consistent. */
export function useUITheme(): UITheme {
  return useContext(ThemeContext);
}
