import type { Theme } from "../../types";
import { uid } from "../../lib/id";
import { sDel, sPut } from "../../lib/storage";
import { afterDelete, afterWrite, blockWrite } from "../helpers";
import type { SliceCreator } from "../storeTypes";

export interface ThemesSlice {
  themes: Theme[];

  upsertTheme: (theme: Theme) => void;
  createTheme: () => Theme | null;
  deleteTheme: (id: string) => void;
}

export const createThemesSlice: SliceCreator<ThemesSlice> = (set, get) => ({
  themes: [],

  upsertTheme: (theme) => {
    if (blockWrite(get)) return;
    set((state) => {
      const exists = state.themes.some((t) => t.id === theme.id);
      const themes = exists
        ? state.themes.map((t) => (t.id === theme.id ? theme : t))
        : [...state.themes, theme];
      return { themes };
    });
    void sPut("themes", theme);
    afterWrite(get);
  },

  createTheme: () => {
    if (blockWrite(get)) return null;
    const base = get().themes.find((t) => t.id === "classic") || get().themes[0];
    const theme: Theme = {
      ...base,
      id: uid(),
      name: "New Theme",
      builtIn: false,
    };
    get().upsertTheme(theme);
    return theme;
  },

  deleteTheme: (id) => {
    const theme = get().themes.find((t) => t.id === id);
    if (theme?.builtIn) return;
    set((state) => ({ themes: state.themes.filter((t) => t.id !== id) }));
    void sDel("themes", id);
    afterDelete(get);
  },
});
