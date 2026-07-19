import type { AudioItem, Background, Song, Theme } from "../types";

/**
 * "Keep on reset": songs and custom themes the user registers to survive
 * "Reset App to Defaults". Everything else goes back to first-run state.
 *
 * A kept item keeps its own configuration exactly as it was. What it *points
 * at* can't always be kept, though: a reset wipes custom backgrounds, audio
 * and uploaded files. So a kept song that used a theme which also survived
 * still uses it, and one whose theme was wiped falls back to the default song
 * theme. The same applies to backgrounds and audio.
 */

/** Songs and custom themes share one budget. */
export const MAX_KEPT_ITEMS = 5;

export type KeepableKind = "song" | "theme";

interface Keepable {
  keepOnReset?: boolean;
  builtIn?: boolean;
  deleted?: boolean;
}

/**
 * Built-in songs and themes are restored by a reset anyway, and trashed songs
 * aren't worth a slot, so neither can hold one.
 */
export const canKeep = (item: Keepable): boolean => !item.builtIn && !item.deleted;

export const isKept = (item: Keepable): boolean => Boolean(item.keepOnReset) && canKeep(item);

export const keptSongs = (songs: Song[]): Song[] => songs.filter(isKept);
export const keptThemes = (themes: Theme[]): Theme[] => themes.filter(isKept);

/** How many of the five slots are in use, across both kinds. */
export const keptCount = (songs: Song[], themes: Theme[]): number =>
  keptSongs(songs).length + keptThemes(themes).length;

export const keptSlotsLeft = (songs: Song[], themes: Theme[]): number =>
  Math.max(0, MAX_KEPT_ITEMS - keptCount(songs, themes));

/**
 * Repoints a kept song at things that still exist after the reset. Anything
 * that survived is left alone, so a kept song paired with a kept theme keeps
 * that pairing; a reference to something wiped falls back to the default.
 */
export function rehomeKeptSong(
  song: Song,
  surviving: {
    themeIds: Set<string>;
    backgroundIds: Set<string>;
    audioIds: Set<string>;
    defaultThemeId: string;
  }
): Song {
  const themeOk = surviving.themeIds.has(song.defaultThemeId);
  const slides = song.slides.map((slide) => {
    const { backgroundId, audioId } = slide.overrides;
    // Slide-level overrides pointing at wiped assets are dropped rather than
    // redirected: the slide falls back to whatever the song/theme provides.
    const staleBackground = backgroundId && !surviving.backgroundIds.has(backgroundId);
    const staleAudio = audioId && !surviving.audioIds.has(audioId);
    if (!staleBackground && !staleAudio) return slide;
    const overrides = { ...slide.overrides };
    if (staleBackground) delete overrides.backgroundId;
    if (staleAudio) delete overrides.audioId;
    return { ...slide, overrides };
  });

  return {
    ...song,
    defaultThemeId: themeOk ? song.defaultThemeId : surviving.defaultThemeId,
    defaultBackgroundId:
      song.defaultBackgroundId && surviving.backgroundIds.has(song.defaultBackgroundId)
        ? song.defaultBackgroundId
        : "",
    defaultAudioId:
      song.defaultAudioId && surviving.audioIds.has(song.defaultAudioId)
        ? song.defaultAudioId
        : null,
    slides,
  };
}

/** The theme equivalent: a kept theme whose custom background was wiped falls back to a built-in one. */
export function rehomeKeptTheme(
  theme: Theme,
  surviving: { backgroundIds: Set<string>; audioIds: Set<string>; defaultBackgroundId: string }
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
 * Works out the songs and themes a reset should end up with: the built-in
 * defaults, plus every kept item repointed at what survived alongside it.
 */
export function survivingAfterReset(options: {
  songs: Song[];
  themes: Theme[];
  seedSongs: Song[];
  builtInThemes: Theme[];
  builtInBackgrounds: Background[];
  builtInAudio: AudioItem[];
  defaultThemeId: string;
}): { songs: Song[]; themes: Theme[]; keptSongs: Song[]; keptThemes: Theme[] } {
  // The UI stops at five, but an imported backup can carry records marked by
  // someone else, so the cap is enforced here too. Themes take precedence: a
  // kept song paired with a kept theme should keep that pairing.
  const keptThemeList = keptThemes(options.themes).slice(0, MAX_KEPT_ITEMS);
  const songBudget = Math.max(0, MAX_KEPT_ITEMS - keptThemeList.length);
  const themes = [...options.builtInThemes, ...keptThemeList];

  const backgroundIds = new Set(options.builtInBackgrounds.map((b) => b.id));
  const audioIds = new Set(options.builtInAudio.map((a) => a.id));
  const themeIds = new Set(themes.map((t) => t.id));
  const defaultBackgroundId =
    options.builtInThemes[0]?.backgroundId || options.builtInBackgrounds[0]?.id || "";
  // The fallback theme must itself be surviving, or kept songs would point at
  // nothing; a missing default lands on the first built-in theme.
  const defaultThemeId = themeIds.has(options.defaultThemeId)
    ? options.defaultThemeId
    : options.builtInThemes[0]?.id || "";

  const rehomedThemes = keptThemeList.map((theme) =>
    rehomeKeptTheme(theme, { backgroundIds, audioIds, defaultBackgroundId })
  );
  const rehomedSongs = keptSongs(options.songs)
    .slice(0, songBudget)
    .map((song) => rehomeKeptSong(song, { themeIds, backgroundIds, audioIds, defaultThemeId }));

  return {
    songs: [...rehomedSongs, ...options.seedSongs],
    themes: [...options.builtInThemes, ...rehomedThemes],
    keptSongs: rehomedSongs,
    keptThemes: rehomedThemes,
  };
}
