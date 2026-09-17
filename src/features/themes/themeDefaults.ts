import type { Theme } from "../../types";
import { builtInTheme } from "../../data/themes";

/**
 * The shipped definition of a built-in theme, carrying over the fields the
 * library owns rather than the editor: when it was made, and whether it was
 * marked to survive a reset. Settings a built-in theme ships without, such as
 * auto-play or background audio, fall away with everything else.
 */
export const themeDefaults = (theme: Theme): Theme | null => {
  const shipped = builtInTheme(theme.id);
  if (!shipped) return null;
  return {
    ...shipped,
    createdAt: theme.createdAt,
    updatedAt: theme.updatedAt,
    keepOnReset: theme.keepOnReset,
    mark: theme.mark,
  };
};

export const sameTheme = (a: Theme, b: Theme): boolean => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<
    keyof Theme
  >;
  for (const key of keys) if (a[key] !== b[key]) return false;
  return true;
};
