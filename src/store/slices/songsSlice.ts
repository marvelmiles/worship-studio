import type { Song } from "../../types";
import { now, uid } from "../../lib/id";
import { parseLyrics } from "../../lib/parser";
import { deleteRecord, saveRecord } from "../../lib/storage";
import { afterDelete, afterWrite, blockWrite } from "../helpers";
import type { SliceCreator } from "../storeTypes";

export const UNTITLED_SONG = "Untitled Song";

/** True while a song still carries the name it was created with. */
export const isUntitledSong = (title: string): boolean =>
  !title.trim() || title.trim() === UNTITLED_SONG;

export interface SongsSlice {
  songs: Song[];

  upsertSong: (song: Song) => void;
  createSong: () => Song | null;
  trashSong: (id: string) => void;
  restoreSong: (id: string) => void;
  deleteSong: (id: string) => void;
}

export const createSongsSlice: SliceCreator<SongsSlice> = (set, get) => ({
  songs: [],

  upsertSong: (song) => {
    if (blockWrite(get)) return;
    set((state) => {
      const exists = state.songs.some((s) => s.id === song.id);
      const songs = exists
        ? state.songs.map((s) => (s.id === song.id ? song : s))
        : [song, ...state.songs];
      return { songs };
    });
    void saveRecord("songs", song);
    afterWrite(get);
  },

  createSong: () => {
    if (blockWrite(get)) return null;
    const lyrics = "[verse]\nType your lyrics here";
    const song: Song = {
      id: uid(),
      title: UNTITLED_SONG,
      artist: "",
      category: "Worship",
      defaultThemeId: get().prefs.defaultSongThemeId || "classic",
      defaultBackgroundId: "",
      defaultAudioId: null,
      lyrics,
      maxLines: 6,
      autoPlay: undefined,
      slideDurationSeconds: undefined,
      createdAt: now(),
      updatedAt: now(),
      deleted: false,
      builtIn: false,
      style: {},
      slides: parseLyrics(lyrics, 6),
    };
    get().upsertSong(song);
    return song;
  },

  trashSong: (id) => {
    const song = get().songs.find((s) => s.id === id);
    if (song && !song.builtIn)
      get().upsertSong({ ...song, deleted: true, updatedAt: now() });
  },
  restoreSong: (id) => {
    const song = get().songs.find((s) => s.id === id);
    if (song) get().upsertSong({ ...song, deleted: false, updatedAt: now() });
  },
  deleteSong: (id) => {
    const song = get().songs.find((s) => s.id === id);
    if (song?.builtIn) return;
    set((state) => ({ songs: state.songs.filter((s) => s.id !== id) }));
    void deleteRecord("songs", id);
    afterDelete(get);
  },
});
