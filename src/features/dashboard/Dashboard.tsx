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
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Background } from "../../types";
import { C, CATEGORIES, DISPLAY, glass, UI } from "../../theme/tokens";
import { useStore } from "../../store/useStore";
import { fmtDate } from "../../lib/id";
import { fmtBytes } from "../../lib/storageStats";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { BgSwatch } from "../../components/controls/BgSwatch";

interface UsedItem {
  id: string;
  name: string;
  count: number;
  bg?: Background;
}

type MostTab = "background" | "theme" | "sound";

function greeting(): { heading: string; tag: string } {
  const h = new Date().getHours();
  if (h >= 5 && h < 12)
    return {
      heading: "Good morning",
      tag: "A fresh start — let's prepare something beautiful.",
    };
  if (h >= 12 && h < 17)
    return {
      heading: "Good afternoon",
      tag: "A great moment to polish your set and get ahead.",
    };
  if (h >= 17 && h < 22)
    return {
      heading: "Good evening",
      tag: "Let's get everything ready for a smooth service.",
    };
  return {
    heading: "Burning the midnight oil",
    tag: "The quiet hours are perfect for getting things done.",
  };
}

function rank(counts: Record<string, number>): [string, number][] {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
}

export function Dashboard() {
  useDocumentTitle("Dashboard · WorshipStudio");
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

  const [mostTab, setMostTab] = useState<MostTab>("background");
  const { heading, tag } = useMemo(greeting, []);

  const active = useMemo(() => songs.filter((s) => !s.deleted), [songs]);
  const totalSlides = active.reduce((n, s) => n + (s.slides?.length || 0), 0);
  const recent = [...active]
    .sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1))
    .slice(0, 5);
  const byCat = CATEGORIES.map((c) => ({
    name: c,
    n: active.filter((s) => s.category === c).length,
  })).filter((x) => x.n > 0);
  const maxCat = Math.max(1, ...byCat.map((x) => x.n));

  const bgMap = useMemo(() => {
    const map: Record<string, Background> = {};
    for (const bg of backgrounds) map[bg.id] = bg;
    return map;
  }, [backgrounds]);

  const mostUsed = useMemo<Record<MostTab, UsedItem[]>>(() => {
    const themeUse: Record<string, number> = {};
    const bgUse: Record<string, number> = {};
    const soundUse: Record<string, number> = {};
    for (const s of active) {
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
          bg: t ? bgMap[t.backgroundId] : undefined,
        };
      }),
      background: rank(bgUse).map(([id, count]) => {
        const bg = bgMap[id];
        return { id, count, name: bg?.name || "Unknown", bg };
      }),
      sound: rank(soundUse).map(([id, count]) => {
        const a = audio.find((x) => x.id === id);
        return { id, count, name: a?.name || "Unknown" };
      }),
    };
  }, [active, themes, audio, bgMap]);

  const onNew = () => {
    const created = createSong();
    if (created) navigate(`/songs/${created.id}`);
  };

  const savedPassages = scriptures.filter((s) => !s.quick && !s.deleted).length;
  const imageCount = media.filter((m) => m.kind === "image").length;
  const videoCount = media.filter((m) => m.kind === "video").length;

  const stats: { label: string; value: number; icon: LucideIcon }[] = [
    { label: "Songs", value: active.length, icon: Music },
    { label: "Slides", value: totalSlides, icon: Layers },
    { label: "Passages", value: savedPassages, icon: BookOpen },
    { label: "Images", value: imageCount, icon: ImageIcon },
    { label: "Videos", value: videoCount, icon: Film },
    { label: "Themes", value: themes.length, icon: Palette },
    { label: "Sounds", value: audio.length, icon: Volume2 },
  ];
  const actions: {
    label: string;
    icon: LucideIcon;
    fn: () => void;
    primary?: boolean;
  }[] = [
    { label: "New Song", icon: Plus, fn: onNew, primary: true },
    { label: "Open Bible", icon: BookOpen, fn: () => navigate("/bible") },
    { label: "Song Library", icon: Music, fn: () => navigate("/songs") },
    { label: "Images", icon: ImageIcon, fn: () => navigate("/images") },
    { label: "Videos", icon: Film, fn: () => navigate("/videos") },
    { label: "Manage Themes", icon: Palette, fn: () => openOverlay("themes") },
    { label: "Upload Assets", icon: Upload, fn: () => openOverlay("assets") },
  ];

  const mostTabs: { id: MostTab; label: string }[] = [
    { id: "background", label: "Backgrounds" },
    { id: "theme", label: "Themes" },
    { id: "sound", label: "Sounds" },
  ];
  const mostList = mostUsed[mostTab];
  const maxUse = Math.max(1, ...mostList.map((m) => m.count));

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
            color: C.gold,
            fontFamily: UI,
            fontWeight: 600,
            letterSpacing: 1.2,
            fontSize: 12,
          }}
        >
          {tag}
        </p>
        <h1
          style={{
            margin: "4px 0 0",
            fontFamily: DISPLAY,
            fontSize: "clamp(26px,5vw,38px)",
            fontWeight: 600,
            color: C.text,
            letterSpacing: -0.5,
          }}
        >
          {heading}
        </h1>
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
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: DISPLAY,
                    fontSize: 34,
                    fontWeight: 600,
                    color: C.text,
                    lineHeight: 1,
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    fontFamily: UI,
                    fontSize: 13,
                    color: C.sub,
                    marginTop: 6,
                  }}
                >
                  {s.label}
                </div>
              </div>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 11,
                  display: "grid",
                  placeItems: "center",
                  background: "rgba(216,162,74,0.12)",
                  color: C.goldSoft,
                }}
              >
                <s.icon size={19} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {storage && (
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
                      ? "rgba(224,100,79,0.14)"
                      : storage.level === "warn"
                        ? "rgba(216,162,74,0.14)"
                        : "rgba(63,191,127,0.14)",
                  color:
                    storage.level === "critical"
                      ? C.danger
                      : storage.level === "warn"
                        ? "#e0a64f"
                        : "#46c98a",
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
                    color: C.text,
                  }}
                >
                  Storage used
                </div>
                <div
                  style={{
                    fontFamily: UI,
                    fontSize: 12,
                    color: C.sub,
                    marginTop: 2,
                  }}
                >
                  {storage.blocked
                    ? "Storage full — delete songs, audio or backgrounds to continue"
                    : storage.level === "critical"
                      ? "Critical — free up space soon"
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
                  color: storage.level === "critical" ? C.danger : C.text,
                  lineHeight: 1,
                }}
              >
                {Math.min(100, Math.round(storage.pct * 100))}%
              </div>
              <div style={{ fontSize: 11.5, color: C.dim, marginTop: 4 }}>
                {fmtBytes(storage.userUsed)} of {fmtBytes(storage.userMax)}
              </div>
            </div>
          </div>
          <div
            style={{
              height: 9,
              borderRadius: 99,
              background: "rgba(255,255,255,0.07)",
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
                    ? `linear-gradient(90deg, #e0644f, #f08a78)`
                    : storage.level === "warn"
                      ? `linear-gradient(90deg, ${C.gold}, ${C.goldSoft})`
                      : `linear-gradient(90deg, #2f9e6a, #46c98a)`,
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
            onClick={a.fn}
            style={{
              ...glass,
              padding: "20px",
              textAlign: "left",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 14,
              border: a.primary
                ? "1px solid rgba(216,162,74,0.4)"
                : `1px solid ${C.border}`,
              background: a.primary
                ? "linear-gradient(120deg,rgba(216,162,74,0.16),rgba(24,22,31,0.62))"
                : C.panel,
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
                background: a.primary ? "rgba(216,162,74,0.22)" : C.raise,
                color: a.primary ? C.goldSoft : C.text,
              }}
            >
              <a.icon size={21} />
            </div>
            <span
              style={{
                fontFamily: UI,
                fontWeight: 600,
                fontSize: 15,
                color: C.text,
              }}
            >
              {a.label}
            </span>
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
              color: C.text,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Clock size={16} color={C.gold} /> Recent Songs
          </h3>
          {recent.length === 0 && (
            <p style={{ color: C.dim, fontFamily: UI, fontSize: 14 }}>
              No songs yet — create your first one.
            </p>
          )}
          {recent.map((s) => (
            <div
              key={s.id}
              onClick={() => navigate(`/songs/${s.id}`)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "11px 0",
                borderBottom: `1px solid ${C.border}`,
                cursor: "pointer",
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: UI,
                    fontWeight: 600,
                    fontSize: 14.5,
                    color: C.text,
                  }}
                >
                  {s.title}
                </div>
                <div style={{ fontFamily: UI, fontSize: 12.5, color: C.sub }}>
                  {s.artist || "Unknown"} · {s.slides?.length || 0} slides
                </div>
              </div>
              <span style={{ fontFamily: UI, fontSize: 12, color: C.dim }}>
                {fmtDate(s.updatedAt)}
              </span>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ ...glass, padding: 22 }}>
            <h3
              style={{
                margin: "0 0 14px",
                fontFamily: DISPLAY,
                fontSize: 18,
                color: C.text,
              }}
            >
              By Collection
            </h3>
            {byCat.length === 0 && (
              <p style={{ color: C.dim, fontFamily: UI, fontSize: 14 }}>—</p>
            )}
            {byCat.map((c) => (
              <div key={c.name} style={{ marginBottom: 11 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontFamily: UI,
                    fontSize: 13,
                    color: C.sub,
                    marginBottom: 5,
                  }}
                >
                  <span>{c.name}</span>
                  <span>{c.n}</span>
                </div>
                <div
                  style={{
                    height: 7,
                    borderRadius: 99,
                    background: "rgba(255,255,255,0.07)",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${(c.n / maxCat) * 100}%`,
                      borderRadius: 99,
                      background: `linear-gradient(90deg,${C.gold},${C.goldSoft})`,
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
                color: C.text,
              }}
            >
              Most Used
            </h3>
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {mostTabs.map((t) => {
                const activeTab = mostTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setMostTab(t.id)}
                    style={{
                      flex: 1,
                      padding: "7px 0",
                      borderRadius: 9,
                      cursor: "pointer",
                      fontFamily: UI,
                      fontSize: 12.5,
                      fontWeight: 600,
                      border: `1px solid ${activeTab ? "rgba(216,162,74,0.4)" : C.border}`,
                      background: activeTab
                        ? "rgba(216,162,74,0.16)"
                        : "transparent",
                      color: activeTab ? C.goldSoft : C.sub,
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
            {mostList.length === 0 ? (
              <p
                style={{
                  color: C.dim,
                  fontFamily: UI,
                  fontSize: 13.5,
                  margin: "6px 0",
                }}
              >
                Nothing used yet — it fills in as you build songs.
              </p>
            ) : (
              mostList.map((item) => (
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
                        border: `1px solid ${C.border}`,
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
                        background: "rgba(216,162,74,0.14)",
                        border: `1px solid ${C.border}`,
                        color: C.goldSoft,
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
                        color: C.text,
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
                        background: "rgba(255,255,255,0.07)",
                        marginTop: 4,
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${(item.count / maxUse) * 100}%`,
                          borderRadius: 99,
                          background: `linear-gradient(90deg,${C.gold},${C.goldSoft})`,
                        }}
                      />
                    </div>
                  </div>
                  <span
                    style={{
                      fontFamily: UI,
                      fontSize: 12.5,
                      color: C.sub,
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
