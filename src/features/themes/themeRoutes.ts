export const THEMES_PATH = "/themes";

export const themePath = (themeId: string): string =>
  `${THEMES_PATH}/${themeId}`;
