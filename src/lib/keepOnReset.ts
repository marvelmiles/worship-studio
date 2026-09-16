import type { AudioItem, Background, Manuscript, Theme } from "../types";

export const MAX_KEPT_ITEMS = 5;

export type KeepableKind = "manuscript" | "theme";

interface Keepable {
  keepOnReset?: boolean;
  builtIn?: boolean;
  deleted?: boolean;
}

export const canKeep = (item: Keepable): boolean =>
  !item.builtIn && !item.deleted;

export const isKept = (item: Keepable): boolean =>
  Boolean(item.keepOnReset) && canKeep(item);

export const keptManuscripts = (manuscripts: Manuscript[]): Manuscript[] =>
  manuscripts.filter(isKept);
export const keptThemes = (themes: Theme[]): Theme[] => themes.filter(isKept);

export const keptCount = (manuscripts: Manuscript[], themes: Theme[]): number =>
  keptManuscripts(manuscripts).length + keptThemes(themes).length;

export const rehomeKeptManuscript = (
  manuscript: Manuscript,
  surviving: {
    themeIds: Set<string>;
    backgroundIds: Set<string>;
    audioIds: Set<string>;
    defaultThemeId: string;
  },
): Manuscript => {
  const themeOk = surviving.themeIds.has(manuscript.defaultThemeId);
  const slides = manuscript.slides.map((slide) => {
    const { backgroundId, audioId } = slide.overrides;
    const staleBackground =
      backgroundId && !surviving.backgroundIds.has(backgroundId);
    const staleAudio = audioId && !surviving.audioIds.has(audioId);
    if (!staleBackground && !staleAudio) return slide;
    const overrides = { ...slide.overrides };
    if (staleBackground) delete overrides.backgroundId;
    if (staleAudio) delete overrides.audioId;
    return { ...slide, overrides };
  });

  return {
    ...manuscript,
    defaultThemeId: themeOk
      ? manuscript.defaultThemeId
      : surviving.defaultThemeId,
    defaultBackgroundId:
      manuscript.defaultBackgroundId &&
      surviving.backgroundIds.has(manuscript.defaultBackgroundId)
        ? manuscript.defaultBackgroundId
        : "",
    defaultAudioId:
      manuscript.defaultAudioId &&
      surviving.audioIds.has(manuscript.defaultAudioId)
        ? manuscript.defaultAudioId
        : null,
    slides,
  };
};

export const rehomeKeptTheme = (
  theme: Theme,
  surviving: {
    backgroundIds: Set<string>;
    audioIds: Set<string>;
    defaultBackgroundId: string;
  },
): Theme => {
  return {
    ...theme,
    backgroundId: surviving.backgroundIds.has(theme.backgroundId)
      ? theme.backgroundId
      : surviving.defaultBackgroundId,
    defaultAudioId:
      theme.defaultAudioId && surviving.audioIds.has(theme.defaultAudioId)
        ? theme.defaultAudioId
        : null,
  };
};

export const survivingAfterReset = (options: {
  manuscripts: Manuscript[];
  themes: Theme[];
  seedManuscripts: Manuscript[];
  builtInThemes: Theme[];
  builtInBackgrounds: Background[];
  builtInAudio: AudioItem[];
  defaultThemeId: string;
}): {
  manuscripts: Manuscript[];
  themes: Theme[];
  keptManuscripts: Manuscript[];
  keptThemes: Theme[];
} => {
  const keptThemeList = keptThemes(options.themes).slice(0, MAX_KEPT_ITEMS);
  const manuscriptBudget = Math.max(0, MAX_KEPT_ITEMS - keptThemeList.length);
  const themes = [...options.builtInThemes, ...keptThemeList];

  const backgroundIds = new Set(options.builtInBackgrounds.map((b) => b.id));
  const audioIds = new Set(options.builtInAudio.map((a) => a.id));
  const themeIds = new Set(themes.map((t) => t.id));
  const defaultBackgroundId =
    options.builtInThemes[0]?.backgroundId ||
    options.builtInBackgrounds[0]?.id ||
    "";
  const defaultThemeId = themeIds.has(options.defaultThemeId)
    ? options.defaultThemeId
    : options.builtInThemes[0]?.id || "";

  const rehomedThemes = keptThemeList.map((theme) =>
    rehomeKeptTheme(theme, { backgroundIds, audioIds, defaultBackgroundId }),
  );
  const rehomedManuscripts = keptManuscripts(options.manuscripts)
    .slice(0, manuscriptBudget)
    .map((manuscript) =>
      rehomeKeptManuscript(manuscript, {
        themeIds,
        backgroundIds,
        audioIds,
        defaultThemeId,
      }),
    );

  return {
    manuscripts: [...rehomedManuscripts, ...options.seedManuscripts],
    themes: [...options.builtInThemes, ...rehomedThemes],
    keptManuscripts: rehomedManuscripts,
    keptThemes: rehomedThemes,
  };
};
