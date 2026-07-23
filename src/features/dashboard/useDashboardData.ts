import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Film,
  Image as ImageIcon,
  Music,
  Palette,
  Volume2,
  Wallpaper,
} from "lucide-react";
import type { Background } from "../../types";
import { CATEGORIES } from "../../theme/tokens";
import { useStore } from "../../store/useStore";
import { bookById } from "../../data/bibleBooks";
import { loadReadingHistory } from "../bible/lib/readingHistory";
import { greeting, isCreation, rank } from "./utils";
import type { Activity, UsageTab, UsedItem } from "./utils";

export interface DashboardCounts {
  songs: number;
  totalSlides: number;
  savedPassages: number;
  imageCount: number;
  videoCount: number;
  themes: number;
  sounds: number;
}

export interface CategoryUsage {
  name: string;
  count: number;
}

/**
 * Gathers everything the dashboard renders: the greeting, the headline counts,
 * the songs-by-category breakdown, the most-used artifacts and the cross-module
 * activity feed. Keeping the derivation here leaves the view components purely
 * presentational.
 */
export function useDashboardData() {
  const navigate = useNavigate();
  const songs = useStore((s) => s.songs);
  const scriptures = useStore((s) => s.scriptures);
  const media = useStore((s) => s.media);
  const backgrounds = useStore((s) => s.backgrounds);
  const themes = useStore((s) => s.themes);
  const audio = useStore((s) => s.audio);
  const openOverlay = useStore((s) => s.openOverlay);
  const storage = useStore((s) => s.storage);
  const refreshStorage = useStore((s) => s.refreshStorage);

  useEffect(() => {
    void refreshStorage();
  }, [refreshStorage]);

  const greetingText = useMemo(() => greeting(), []);

  const activeSongs = useMemo(() => songs.filter((s) => !s.deleted), [songs]);
  const totalSlides = activeSongs.reduce(
    (n, s) => n + (s.slides?.length || 0),
    0,
  );

  const songsByCategory: CategoryUsage[] = CATEGORIES.map((c) => ({
    name: c,
    count: activeSongs.filter((s) => s.category === c).length,
  }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);
  const largestCategoryCount = Math.max(
    1,
    ...songsByCategory.map((x) => x.count),
  );

  const backgroundById = useMemo(() => {
    const map: Record<string, Background> = {};
    for (const bg of backgrounds) map[bg.id] = bg;
    return map;
  }, [backgrounds]);

  const mostUsed = useMemo<Record<UsageTab, UsedItem[]>>(() => {
    const themeUse: Record<string, number> = {};
    const bgUse: Record<string, number> = {};
    const soundUse: Record<string, number> = {};
    for (const s of activeSongs) {
      if (s.defaultThemeId)
        themeUse[s.defaultThemeId] = (themeUse[s.defaultThemeId] || 0) + 1;
      if (s.defaultBackgroundId)
        bgUse[s.defaultBackgroundId] = (bgUse[s.defaultBackgroundId] || 0) + 1;
      if (s.defaultAudioId)
        soundUse[s.defaultAudioId] = (soundUse[s.defaultAudioId] || 0) + 1;
    }
    return {
      theme: rank(themeUse).map(([id, count]) => {
        const t = themes.find((x) => x.id === id);
        return {
          id,
          count,
          name: t?.name || "Unknown",
          bg: t ? backgroundById[t.backgroundId] : undefined,
        };
      }),
      background: rank(bgUse).map(([id, count]) => {
        const bg = backgroundById[id];
        return { id, count, name: bg?.name || "Unknown", bg };
      }),
      sound: rank(soundUse).map(([id, count]) => {
        const a = audio.find((x) => x.id === id);
        return { id, count, name: a?.name || "Unknown" };
      }),
    };
  }, [activeSongs, themes, audio, backgroundById]);

  const activities = useMemo<Activity[]>(() => {
    const list: Activity[] = [];

    for (const s of activeSongs) {
      list.push({
        key: `song:${s.id}`,
        title: s.title,
        detail: `Song · ${isCreation(s.createdAt, s.updatedAt) ? "created" : "edited"}`,
        at: s.updatedAt,
        icon: Music,
        open: () => navigate(`/songs/${s.id}`),
      });
    }

    for (const p of scriptures) {
      if (p.quick || p.deleted) continue;
      list.push({
        key: `passage:${p.id}`,
        title: p.title,
        detail: `Bible passage · ${isCreation(p.createdAt, p.updatedAt) ? "saved" : "edited"}`,
        at: p.updatedAt,
        icon: BookOpen,
        open: () => navigate(`/scripture/${p.id}`),
      });
    }

    for (const r of loadReadingHistory()) {
      const book = bookById(r.bookId);
      if (!book) continue;
      list.push({
        key: `bible-read:${r.bookId}:${r.chapter}:${r.verse ?? 0}`,
        title: `${book.name} ${r.chapter}${r.verse ? `:${r.verse}` : ""}`,
        detail: "Bible · read",
        at: r.at,
        icon: BookOpen,
        open: () =>
          navigate("/bible", {
            state: {
              read: { bookId: r.bookId, chapter: r.chapter, verse: r.verse },
            },
          }),
      });
    }

    for (const m of media) {
      if (m.builtIn) continue;
      const label = m.kind === "image" ? "Image" : "Video";
      list.push({
        key: `media:${m.id}`,
        title: m.name,
        detail: `${label} · ${isCreation(m.createdAt, m.updatedAt) ? "added" : "edited"}`,
        at: m.updatedAt || m.createdAt,
        icon: m.kind === "image" ? ImageIcon : Film,
        open: () =>
          navigate(m.kind === "image" ? "/images" : "/videos", {
            state: { openId: m.id },
          }),
      });
    }

    for (const a of audio) {
      if (!a.createdAt) continue;
      list.push({
        key: `audio:${a.id}`,
        title: a.name,
        detail: "Audio · added",
        at: a.createdAt,
        icon: Volume2,
        open: () => openOverlay("assets", "audio"),
      });
    }

    for (const b of backgrounds) {
      if (b.builtIn || !b.createdAt) continue;
      list.push({
        key: `background:${b.id}`,
        title: b.name,
        detail: "Background · added",
        at: b.createdAt,
        icon: Wallpaper,
        open: () => openOverlay("assets", "backgrounds"),
      });
    }

    for (const t of themes) {
      const at = t.updatedAt || t.createdAt;
      if (!at) continue;
      list.push({
        key: `theme:${t.id}`,
        title: t.name,
        detail: `Theme · ${isCreation(t.createdAt, t.updatedAt) ? "created" : "edited"}`,
        at,
        icon: Palette,
        open: () => openOverlay("themes", t.id),
      });
    }

    return list.sort((a, b) => (b.at > a.at ? 1 : -1)).slice(0, 15);
  }, [
    activeSongs,
    scriptures,
    media,
    audio,
    themes,
    backgrounds,
    navigate,
    openOverlay,
  ]);

  const counts: DashboardCounts = {
    songs: activeSongs.length,
    totalSlides,
    savedPassages: scriptures.filter((s) => !s.quick && !s.deleted).length,
    imageCount: media.filter((m) => m.kind === "image").length,
    videoCount: media.filter((m) => m.kind === "video").length,
    themes: themes.length,
    sounds: audio.length,
  };

  return {
    greeting: greetingText,
    counts,
    songsByCategory,
    largestCategoryCount,
    mostUsed,
    activities,
    storage,
  };
}
