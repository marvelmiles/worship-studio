import type { Theme } from "../../types";
import { now, uid } from "../../lib/id";
import { deleteRecord, saveRecord } from "../../lib/storage";
import { afterDelete, afterWrite, blockWrite } from "../helpers";
import type { SliceCreator } from "../storeTypes";

export interface ThemeUpdateOptions {
  /**
   * Moves `updatedAt` to now. Off for writes that aren't edits, such as
   * keep-on-reset, so "recently modified" keeps meaning "recently edited".
   */
  touch?: boolean;
}

export interface ThemesSlice {
  themes: Theme[];

  upsertTheme: (theme: Theme, options?: ThemeUpdateOptions) => void;
  createTheme: () => Theme | null;
  deleteTheme: (id: string) => void;
}

export const createThemesSlice: SliceCreator<ThemesSlice> = (set, get) => ({
  themes: [],

  upsertTheme: (theme, { touch = true }: ThemeUpdateOptions = {}) => {
    if (blockWrite(get)) return;
    const stamped: Theme = touch ? { ...theme, updatedAt: now() } : theme;
    set((state) => {
      const exists = state.themes.some((t) => t.id === stamped.id);
      const themes = exists
        ? state.themes.map((t) => (t.id === stamped.id ? stamped : t))
        : [...state.themes, stamped];
      return { themes };
    });
    void saveRecord("themes", stamped);
    afterWrite(get);
  },

  createTheme: () => {
    if (blockWrite(get)) return null;
    const base =
      get().themes.find((t) => t.id === "classic") || get().themes[0];
    const theme: Theme = {
      ...base,
      id: uid(),
      name: "New Theme",
      builtIn: false,
      createdAt: now(),
    };
    get().upsertTheme(theme);
    return theme;
  },

  deleteTheme: (id) => {
    const theme = get().themes.find((t) => t.id === id);
    if (theme?.builtIn) return;
    set((state) => ({ themes: state.themes.filter((t) => t.id !== id) }));
    void deleteRecord("themes", id);
    afterDelete(get);
  },
});
