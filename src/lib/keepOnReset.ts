import type { AudioItem, Background, Manuscript, Theme } from "../types";

/**
 * "Keep on reset": manuscripts and custom themes the user registers to survive
 * "Reset App to Defaults". Everything else goes back to first-run state.
 *
 * A kept item keeps its own configuration exactly as it was. What it *points
 * at* can't always be kept, though: a reset wipes custom backgrounds, audio
 * and uploaded files. So a kept manuscript that used a theme which also
 * survived still uses it, and one whose theme was wiped falls back to the
 * default manuscript theme. The same applies to backgrounds and audio.
 */

/** Manuscripts and custom themes share one budget. */
export const MAX_KEPT_ITEMS = 5;

export type KeepableKind = "manuscript" | "theme";

interface Keepable {
  keepOnReset?: boolean;
  builtIn?: boolean;
  deleted?: boolean;
}

/**
 * Built-in manuscripts and themes are restored by a reset anyway, and trashed
 * manuscripts aren't worth a slot, so neither can hold one.
 */
export const canKeep = (item: Keepable): boolean =>
  !item.builtIn && !item.deleted;

export const isKept = (item: Keepable): boolean =>
  Boolean(item.keepOnReset) && canKeep(item);

export const keptManuscripts = (manuscripts: Manuscript[]): Manuscript[] =>
  manuscripts.filter(isKept);
export const keptThemes = (themes: Theme[]): Theme[] => themes.filter(isKept);

/** How many of the five slots are in use, across both kinds. */
export const keptCount = (manuscripts: Manuscript[], themes: Theme[]): number =>
  keptManuscripts(manuscripts).length + keptThemes(themes).length;

export const keptSlotsLeft = (
  manuscripts: Manuscript[],
  themes: Theme[],
): number => Math.max(0, MAX_KEPT_ITEMS - keptCount(manuscripts, themes));

/**
 * Repoints a kept manuscript at things that still exist after the reset.
 * Anything that survived is left alone, so a kept manuscript paired with a kept
 * theme keeps that pairing; a reference to something wiped falls back to the
 * default.
 */
export function rehomeKeptManuscript(
  manuscript: Manuscript,
  surviving: {
    themeIds: Set<string>;
    backgroundIds: Set<string>;
    audioIds: Set<string>;
    defaultThemeId: string;
  },
): Manuscript {
  const themeOk = surviving.themeIds.has(manuscript.defaultThemeId);
  const slides = manuscript.slides.map((slide) => {
    const { backgroundId, audioId } = slide.overrides;
    // Slide-level overrides pointing at wiped assets are dropped rather than
    // redirected: the slide falls back to what the manuscript/theme provides.
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
}

/** The theme equivalent: a kept theme whose custom background was wiped falls back to a built-in one. */
export function rehomeKeptTheme(
  theme: Theme,
  surviving: {
    backgroundIds: Set<string>;
    audioIds: Set<string>;
    defaultBackgroundId: string;
  },
): Theme {
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
}

/**
 * Works out the manuscripts and themes a reset should end up with: the built-in
 * defaults, plus every kept item repointed at what survived alongside it.
 */
export function survivingAfterReset(options: {
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
} {
  // The UI stops at five, but an imported backup can carry records marked by
  // someone else, so the cap is enforced here too. Themes take precedence: a
  // kept manuscript paired with a kept theme should keep that pairing.
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
  // The fallback theme must itself be surviving, or kept manuscripts would
  // point at nothing; a missing default lands on the first built-in theme.
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
}
