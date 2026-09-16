import { createContext, useContext, useEffect, type ReactNode } from "react";
import { studioTheme, themeCssVars, type UITheme } from "./uiTheme";

const ThemeContext = createContext<UITheme>(studioTheme);

export const UIThemeProvider = ({
  theme = studioTheme,
  children,
}: {
  theme?: UITheme;
  children: ReactNode;
}) => {
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
};

export const useUITheme = (): UITheme => {
  return useContext(ThemeContext);
};
