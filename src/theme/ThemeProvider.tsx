import { createContext, useContext, useEffect, type ReactNode } from "react";
import { studioTheme, themeCssVars, type UITheme } from "./uiTheme";

const ThemeContext = createContext<UITheme>(studioTheme);

/** Provides the active UI theme to the tree. Swap `theme` to restyle the
 *  whole app; components read it via useUITheme(). The same theme is published
 *  to the document root as `--ws-*` CSS variables so static stylesheets
 *  (index.css) stay in sync without a second source of truth. */
export function UIThemeProvider({
  theme = studioTheme,
  children,
}: {
  theme?: UITheme;
  children: ReactNode;
}) {
  useEffect(() => {
    const root = document.documentElement;
    const vars = themeCssVars(theme);
    for (const [name, value] of Object.entries(vars)) {
      root.style.setProperty(name, value);
    }
    document.body.style.background = theme.colors.bg;
  }, [theme]);

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

/** The app's UI theme (colors, fonts, fills, control tokens). Every
 *  component that styles chrome should read from this hook instead of
 *  hardcoding colors, so themes stay swappable and consistent. */
export function useUITheme(): UITheme {
  return useContext(ThemeContext);
}
