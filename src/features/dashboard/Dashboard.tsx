import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Clock,
  Film,
  HardDrive,
  Image as ImageIcon,
  Layers,
  Music,
  Palette,
  Plus,
  Upload,
  Volume2,
  Wallpaper,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Background } from "../../types";
import { CATEGORIES, fade } from "../../theme/tokens";
import { useUITheme } from "../../theme/ThemeProvider";
import { useStore } from "../../store/useStore";
import { formatDate } from "../../lib/id";
import { formatBytes } from "../../lib/storageStats";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { BgSwatch } from "../../components/controls/BgSwatch";
import { EmptyState } from "../../components/ui/EmptyState";
import { bookById } from "../../data/bibleBooks";
import { loadReadingHistory } from "../bible/lib/readingHistory";

interface UsedItem {
  id: string;
  name: string;
  count: number;
  bg?: Background;
}

type UsageTab = "background" | "theme" | "sound";

/** One row in the Recent Activities feed, gathered from every module. */
interface Activity {
  key: string;
  title: string;
  detail: string;
  at: string;
  icon: LucideIcon;
  open: () => void;
}

/** True when a doc was created and never meaningfully edited afterwards. */
function isCreation(createdAt?: string, updatedAt?: string): boolean {
  if (!createdAt) return false;
  if (!updatedAt) return true;
  return +new Date(updatedAt) - +new Date(createdAt) < 5000;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return formatDate(iso);
}

/** Time-of-day greeting. Neutral and inspirational through the week (the
 *  studio is used far beyond Sunday services); on Sundays the tone leans
 *  church/Christian inspirational. */
function greeting(): { label: string; heading: string; tag: string } {
  const now = new Date();
  const h = now.getHours();
  const sunday = now.getDay() === 0;

  if (h >= 22 || h < 5)
    return {
      label: sunday ? "Blessed Sunday night!" : "Hello, night owl!",
      heading: "Burning the midnight oil",
      tag: sunday
        ? "He gives songs in the night. Rest is a gift too."
        : "The quiet hours are perfect for getting things done.",
    };

  if (sunday) {
    if (h < 12)
      return {
        label: "Happy Sunday!",
        heading: "This is the day the Lord has made",
        tag: "Rejoice, and let's make worship beautiful today.",
      };
    if (h < 17)
      return {
        label: "Happy Sunday!",
        heading: "Grateful hearts, joyful songs",
        tag: "May today's blessing carry through the whole week.",
      };
    return {
      label: "Blessed Sunday evening!",
      heading: "Well done, good and faithful",
      tag: "Rest and be refreshed. What you gave today mattered.",
    };
  }

  if (h < 12)
    return {
      label: "Good morning!",
      heading: "Rise and shine",
      tag: "A fresh start. Let's create something beautiful today.",
    };
  if (h < 17)
    return {
      label: "Good afternoon!",
      heading: "Keep the momentum going",
      tag: "Steady steps today become something great tomorrow.",
    };
  return {
    label: "Good evening!",
    heading: "Let your light shine",
    tag: "Even a quiet evening can carry a joyful song.",
  };
}

function rank(counts: Record<string, number>): [string, number][] {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
}

export function Dashboard() {
  useDocumentTitle("Dashboard · WorshipStudio");
  const theme = useUITheme();
  const { colors, glass, fills, charts, controls } = theme;
  const UI = theme.fonts.ui;
  const DISPLAY = theme.fonts.display;
  const navigate = useNavigate();
  const songs = useStore((s) => s.songs);
  const scriptures = useStore((s) => s.scriptures);
  const media = useStore((s) => s.media);
  const backgrounds = useStore((s) => s.backgrounds);
  const themes = useStore((s) => s.themes);
  const audio = useStore((s) => s.audio);
  const createSong = useStore((s) => s.createSong);
  const openOverlay = useStore((s) => s.openOverlay);
  const storage = useStore((s) => s.storage);
  const refreshStorage = useStore((s) => s.refreshStorage);

  useEffect(() => {
    void refreshStorage();
  }, [refreshStorage]);

  const [usageTab, setUsageTab] = useState<UsageTab>("background");
  const { label, heading, tag } = useMemo(greeting, []);

  const activeSongs = useMemo(() => songs.filter((s) => !s.deleted), [songs]);
  const totalSlides = activeSongs.reduce(
    (n, s) => n + (s.slides?.length || 0),
    0,
  );
  const songsByCategory = CATEGORIES.map((c) => ({
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

  const onNew = () => {
    const created = createSong();
    if (created) navigate(`/songs/${created.id}`);
  };

  const savedPassages = scriptures.filter((s) => !s.quick && !s.deleted).length;
  const imageCount = media.filter((m) => m.kind === "image").length;
  const videoCount = media.filter((m) => m.kind === "video").length;

  const stats: {
    label: string;
    value: number;
    icon: LucideIcon;
    color: string;
  }[] = [
    {
      label: "Songs",
      value: activeSongs.length,
      icon: Music,
      color: charts[0],
    },
    { label: "Slides", value: totalSlides, icon: Layers, color: charts[1] },
    {
      label: "Passages",
      value: savedPassages,
      icon: BookOpen,
      color: charts[2],
    },
    { label: "Images", value: imageCount, icon: ImageIcon, color: charts[3] },
    { label: "Videos", value: videoCount, icon: Film, color: charts[4] },
    { label: "Themes", value: themes.length, icon: Palette, color: charts[5] },
    { label: "Sounds", value: audio.length, icon: Volume2, color: charts[6] },
  ];
  const actions: {
    label: string;
    sub: string;
    icon: LucideIcon;
    onClick: () => void;
    primary?: boolean;
  }[] = [
    {
      label: "New Song",
      sub: "Create a new song",
      icon: Plus,
      onClick: onNew,
      primary: true,
    },
    {
      label: "Open Bible",
      sub: "Browse Bible",
      icon: BookOpen,
      onClick: () => navigate("/bible"),
    },
    {
      label: "Song Library",
      sub: "View all songs",
      icon: Music,
      onClick: () => navigate("/songs"),
    },
    {
      label: "Images",
      sub: "Manage images",
      icon: ImageIcon,
      onClick: () => navigate("/images"),
    },
    {
      label: "Videos",
      sub: "Manage videos",
      icon: Film,
      onClick: () => navigate("/videos"),
    },
    {
      label: "Manage Themes",
      sub: "Customize themes",
      icon: Palette,
      onClick: () => openOverlay("themes"),
    },
    {
      label: "Upload Assets",
      sub: "Add your media",
      icon: Upload,
      onClick: () => openOverlay("assets"),
    },
  ];

  /** Shared accent scheme for ranking bars: the top-ranked row gets the
   *  boldest fill and a glow, lower ranks fade progressively. */
  const rankBar = (rank: number) => {
    const strength = Math.max(0.35, 1 - rank * 0.16);
    return {
      background: `linear-gradient(90deg,${fade(colors.accent, strength)},${fade(colors.accentSoft, strength)})`,
      boxShadow: rank === 0 ? `0 0 10px ${fade(colors.accent, 0.35)}` : "none",
    };
  };

  const usageTabs: { id: UsageTab; label: string }[] = [
    { id: "background", label: "Backgrounds" },
    { id: "theme", label: "Themes" },
    { id: "sound", label: "Sounds" },
  ];
  const mostUsedList = mostUsed[usageTab];
  const highestUseCount = Math.max(1, ...mostUsedList.map((m) => m.count));

  return (
    <div
      style={{
        padding: "clamp(18px,4vw,32px) clamp(14px,4vw,36px)",
        maxWidth: 1240,
        margin: "0 auto",
      }}
    >
      <div style={{ marginBottom: 26 }}>
        <p
          style={{
            margin: 0,
            color: colors.accent,
            fontFamily: UI,
            fontWeight: 600,
            letterSpacing: 1.2,
            fontSize: 13,
          }}
        >
          {label}
        </p>
        <h1
          style={{
            margin: "6px 0 0",
            fontFamily: DISPLAY,
            fontSize: "clamp(28px,5.5vw,44px)",
            fontWeight: 600,
            color: colors.text,
            letterSpacing: -0.5,
          }}
        >
          {heading}
        </h1>
        <p
          style={{
            margin: "10px 0 0",
            fontFamily: UI,
            fontSize: 14.5,
            color: colors.sub,
          }}
        >
          {tag}
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
          gap: 14,
          marginBottom: 26,
        }}
      >
        {stats.map((s) => (
          <div key={s.label} style={{ ...glass, padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  display: "grid",
                  placeItems: "center",
                  background: fade(s.color, 0.13),
                  color: s.color,
                  flexShrink: 0,
                }}
              >
                <s.icon size={20} />
              </div>
              <div>
                <div
                  style={{
                    fontFamily: DISPLAY,
                    fontSize: 30,
                    fontWeight: 600,
                    color: colors.text,
                    lineHeight: 1,
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    fontFamily: UI,
                    fontSize: 13,
                    color: colors.sub,
                    marginTop: 5,
                  }}
                >
                  {s.label}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {storage &&
        (storage.level !== "ok" || storage.backend !== "indexeddb") && (
          <div style={{ ...glass, padding: "16px 20px", marginBottom: 26 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 11,
                    display: "grid",
                    placeItems: "center",
                    background:
                      storage.level === "critical"
                        ? fade(colors.danger, 0.14)
                        : storage.level === "warn"
                          ? fade(colors.warning, 0.14)
                          : fade(colors.success, 0.14),
                    color:
                      storage.level === "critical"
                        ? colors.danger
                        : storage.level === "warn"
                          ? colors.warning
                          : colors.success,
                    flexShrink: 0,
                  }}
                >
                  <HardDrive size={19} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: UI,
                      fontWeight: 600,
                      fontSize: 14,
                      color: colors.text,
                    }}
                  >
                    Storage used
                  </div>
                  <div
                    style={{
                      fontFamily: UI,
                      fontSize: 12,
                      color: colors.sub,
                      marginTop: 2,
                    }}
                  >
                    {storage.blocked
                      ? "Storage full. Delete songs, audio or backgrounds to continue"
                      : storage.level === "critical"
                        ? "Critical: free up space soon"
                        : storage.level === "warn"
                          ? "Storage is filling up"
                          : "Plenty of space available"}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right", fontFamily: UI }}>
                <div
                  style={{
                    fontFamily: DISPLAY,
                    fontSize: 22,
                    fontWeight: 600,
                    color:
                      storage.level === "critical"
                        ? colors.danger
                        : colors.text,
                    lineHeight: 1,
                  }}
                >
                  {Math.min(100, Math.round(storage.pct * 100))}%
                </div>
                <div
                  style={{ fontSize: 11.5, color: colors.dim, marginTop: 4 }}
                >
                  {formatBytes(storage.userUsed)} used, about{" "}
                  {formatBytes(Math.max(0, storage.userMax - storage.userUsed))}{" "}
                  free
                </div>
              </div>
            </div>
            <div
              style={{
                height: 9,
                borderRadius: 99,
                background: controls.track,
                overflow: "hidden",
                marginTop: 13,
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${Math.max(2, Math.min(100, storage.pct * 100))}%`,
                  borderRadius: 99,
                  background:
                    storage.level === "critical"
                      ? fills.dangerBar
                      : storage.level === "warn"
                        ? fills.accentBar
                        : fills.successBar,
                  transition: "width 0.4s ease",
                }}
              />
            </div>
          </div>
        )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
          gap: 14,
          marginBottom: 30,
        }}
      >
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={a.onClick}
            style={{
              ...glass,
              padding: "20px",
              textAlign: "left",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 14,
              border: a.primary
                ? `1px solid ${fade(colors.accentSoft, 0.45)}`
                : `1px solid ${colors.border}`,
              background: a.primary ? fills.ctaCard : colors.panel,
              boxShadow: a.primary
                ? `${theme.shadows.cta}, inset 0 1px 0 rgba(255,255,255,0.12)`
                : glass.boxShadow,
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.transform = "translateY(-2px)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                display: "grid",
                placeItems: "center",
                background: a.primary ? "rgba(255,255,255,0.16)" : colors.raise,
                color: a.primary ? "#ffffff" : colors.text,
              }}
            >
              <a.icon size={21} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: UI,
                  fontWeight: 600,
                  fontSize: 15,
                  color: a.primary ? colors.onAccent : colors.text,
                }}
              >
                {a.label}
              </div>
              <div
                style={{
                  fontFamily: UI,
                  fontSize: 12.5,
                  marginTop: 3,
                  color: a.primary ? "rgba(255,255,255,0.75)" : colors.sub,
                }}
              >
                {a.sub}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
          gap: 16,
        }}
      >
        <div style={{ ...glass, padding: 22 }}>
          <h3
            style={{
              margin: "0 0 14px",
              fontFamily: DISPLAY,
              fontSize: 18,
              color: colors.text,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Clock size={16} color={colors.accent} /> Recent Activities
          </h3>
          {activities.length === 0 && (
            <EmptyState
              bare
              compact
              icon={Clock}
              title="No activity yet"
              message="Create a song, read the Bible or upload media and it will show up here."
            />
          )}
          <div style={{ maxHeight: 520, overflowY: "auto" }}>
            {activities.map((a) => (
              <div
                key={a.key}
                onClick={a.open}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "11px 0",
                  borderBottom: `1px solid ${colors.border}`,
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    display: "grid",
                    placeItems: "center",
                    background: fade(colors.accent, 0.12),
                    color: colors.accentSoft,
                    flexShrink: 0,
                  }}
                >
                  <a.icon size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: UI,
                      fontWeight: 600,
                      fontSize: 14.5,
                      color: colors.text,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {a.title}
                  </div>
                  <div
                    style={{
                      fontFamily: UI,
                      fontSize: 12.5,
                      color: colors.sub,
                    }}
                  >
                    {a.detail}
                  </div>
                </div>
                <span
                  style={{
                    fontFamily: UI,
                    fontSize: 12,
                    color: colors.dim,
                    flexShrink: 0,
                  }}
                >
                  {timeAgo(a.at)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ ...glass, padding: 22 }}>
            <h3
              style={{
                margin: "0 0 14px",
                fontFamily: DISPLAY,
                fontSize: 18,
                color: colors.text,
              }}
            >
              Songs by Category
            </h3>
            {songsByCategory.length === 0 && (
              <EmptyState
                bare
                compact
                icon={Music}
                title="No categories yet"
                message="Give your songs a category and the breakdown appears here."
              />
            )}
            {songsByCategory.map((c, rank) => (
              <div key={c.name} style={{ marginBottom: 11 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontFamily: UI,
                    fontSize: 13,
                    color: colors.sub,
                    marginBottom: 5,
                  }}
                >
                  <span>{c.name}</span>
                  <span style={{ color: colors.text }}>{c.count}</span>
                </div>
                <div
                  style={{
                    height: 7,
                    borderRadius: 99,
                    background: controls.track,
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${(c.count / largestCategoryCount) * 100}%`,
                      borderRadius: 99,
                      ...rankBar(rank),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div style={{ ...glass, padding: 22 }}>
            <h3
              style={{
                margin: "0 0 12px",
                fontFamily: DISPLAY,
                fontSize: 18,
                color: colors.text,
              }}
            >
              Most Used Artifacts
            </h3>
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {usageTabs.map((t) => {
                const activeTab = usageTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setUsageTab(t.id)}
                    style={{
                      flex: 1,
                      padding: "7px 0",
                      borderRadius: 9,
                      cursor: "pointer",
                      fontFamily: UI,
                      fontSize: 12.5,
                      fontWeight: 600,
                      border: `1px solid ${activeTab ? fade(colors.accent, 0.4) : colors.border}`,
                      background: activeTab
                        ? fade(colors.accent, 0.16)
                        : "transparent",
                      color: activeTab ? colors.accentSoft : colors.sub,
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
            {mostUsedList.length === 0 ? (
              <EmptyState
                bare
                compact
                icon={Layers}
                title="Nothing used yet"
                message="This fills in as you build songs with themes, backgrounds and sounds."
              />
            ) : (
              mostUsedList.map((item, rank) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 11,
                    padding: "8px 0",
                  }}
                >
                  {item.bg ? (
                    <BgSwatch
                      bg={item.bg}
                      style={{
                        width: 46,
                        height: 27,
                        borderRadius: 6,
                        flexShrink: 0,
                        overflow: "hidden",
                        border: `1px solid ${colors.border}`,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 46,
                        height: 27,
                        borderRadius: 6,
                        flexShrink: 0,
                        display: "grid",
                        placeItems: "center",
                        background: fade(colors.accent, 0.14),
                        border: `1px solid ${colors.border}`,
                        color: colors.accentSoft,
                      }}
                    >
                      <Volume2 size={14} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: UI,
                        fontSize: 13.5,
                        color: colors.text,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.name}
                    </div>
                    <div
                      style={{
                        height: 5,
                        borderRadius: 99,
                        background: controls.track,
                        marginTop: 4,
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${(item.count / highestUseCount) * 100}%`,
                          borderRadius: 99,
                          ...rankBar(rank),
                        }}
                      />
                    </div>
                  </div>
                  <span
                    style={{
                      fontFamily: UI,
                      fontSize: 12.5,
                      color: colors.sub,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    ×{item.count}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
