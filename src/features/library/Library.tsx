import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Music, Pencil, Play, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import type { Background } from "../../types";
import { C, CATEGORIES, DISPLAY, glass, UI } from "../../theme/tokens";
import { useStore } from "../../store/useStore";
import { resolveLineStyle, resolveStyle } from "../../lib/resolve";
import { SlideCanvas } from "../../components/SlideCanvas";
import { swatchBackground } from "../../components/controls/BackgroundPicker";
import { Btn, IconBtn } from "../../components/ui/Button";
import { TextInput } from "../../components/ui/Field";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";

export function Library() {
  useDocumentTitle("Library · WorshipStudio");
  const navigate = useNavigate();
  const songs = useStore((s) => s.songs);
  const themes = useStore((s) => s.themes);
  const backgrounds = useStore((s) => s.backgrounds);
  const createSong = useStore((s) => s.createSong);
  const trashSong = useStore((s) => s.trashSong);
  const restoreSong = useStore((s) => s.restoreSong);
  const deleteSong = useStore((s) => s.deleteSong);
  const startPresent = useStore((s) => s.startPresent);

  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [trashView, setTrashView] = useState(false);

  const bgMap = useMemo(() => {
    const map: Record<string, Background> = {};
    for (const bg of backgrounds) map[bg.id] = bg;
    return map;
  }, [backgrounds]);

  const onNew = () => {
    const created = createSong();
    if (created) navigate(`/editor/${created.id}`);
  };

  const list = useMemo(() => {
    let base = songs.filter((s) => (trashView ? s.deleted : !s.deleted));
    if (cat !== "All") base = base.filter((s) => s.category === cat);
    const term = q.trim().toLowerCase();
    if (term)
      base = base.filter((s) =>
        [s.title, s.artist, s.category, s.lyrics]
          .filter(Boolean)
          .some((f) => (f as string).toLowerCase().includes(term))
      );
    return base.sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1));
  }, [songs, q, cat, trashView]);

  return (
    <div style={{ padding: "clamp(18px,4vw,28px) clamp(14px,4vw,36px)", maxWidth: 1320, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 14,
          marginBottom: 18,
        }}
      >
        <h1 style={{ margin: 0, fontFamily: DISPLAY, fontSize: "clamp(22px,4vw,30px)", fontWeight: 600, color: C.text }}>
          {trashView ? "Trash" : "Song Library"}
        </h1>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn variant={trashView ? "primary" : "ghost"} onClick={() => setTrashView(!trashView)}>
            <Trash2 size={15} />
            {trashView ? "Library" : "Trash"}
          </Btn>
          {!trashView && (
            <Btn variant="primary" onClick={onNew}>
              <Plus size={16} />
              New Song
            </Btn>
          )}
        </div>
      </div>

      {!trashView && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18, alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <Search size={16} style={{ position: "absolute", left: 13, top: 12, color: C.dim }} />
            <TextInput
              placeholder="Search by title, artist, lyrics…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ paddingLeft: 38 }}
            />
          </div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {["All", ...CATEGORIES].map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 999,
                  fontFamily: UI,
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: `1px solid ${cat === c ? "rgba(216,162,74,0.4)" : C.border}`,
                  background: cat === c ? "rgba(216,162,74,0.16)" : "transparent",
                  color: cat === c ? C.goldSoft : C.sub,
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {list.length === 0 && (
        <div style={{ ...glass, padding: 60, textAlign: "center" }}>
          <Music size={36} color={C.dim} style={{ margin: "0 auto 14px" }} />
          <p style={{ fontFamily: UI, color: C.sub, margin: 0 }}>
            {trashView ? "Trash is empty." : "No songs match. Add one to get started."}
          </p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 16 }}>
        {list.map((s) => {
          const first = s.slides?.[0];
          const theme = themes.find((t) => t.id === s.defaultThemeId) || themes[0];
          const bg = bgMap[s.defaultBackgroundId || theme.backgroundId] || backgrounds[0];
          return (
            <div
              key={s.id}
              style={{ ...glass, overflow: "hidden", display: "flex", flexDirection: "column" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.borderStrong)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}
            >
              <div
                onClick={() => !trashView && navigate(`/editor/${s.id}`)}
                style={{ cursor: trashView ? "default" : "pointer", position: "relative" }}
              >
                {first ? (
                  <SlideCanvas
                    slide={first}
                    bg={bg}
                    radius={0}
                    style={resolveStyle(first, s, theme)}
                    lineStyles={first.lines.map((_, i) => resolveLineStyle(first, i, s, theme))}
                  />
                ) : (
                  <div style={{ aspectRatio: "16/9", background: swatchBackground(bg) }} />
                )}
                <div
                  style={{
                    position: "absolute",
                    top: 9,
                    right: 9,
                    background: "rgba(0,0,0,0.5)",
                    borderRadius: 8,
                    padding: "3px 9px",
                    fontFamily: UI,
                    fontSize: 11.5,
                    color: "#fff",
                    fontWeight: 600,
                  }}
                >
                  {s.slides?.length || 0} slides
                </div>
              </div>
              <div style={{ padding: "13px 15px", flex: 1, display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    fontFamily: DISPLAY,
                    fontSize: 17,
                    fontWeight: 600,
                    color: C.text,
                    lineHeight: 1.2,
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                  }}
                >
                  {s.title}
                  {s.builtIn && (
                    <span style={{ fontFamily: UI, fontSize: 10, fontWeight: 700, color: C.dim, letterSpacing: 0.4 }}>
                      DEFAULT
                    </span>
                  )}
                </div>
                <div style={{ fontFamily: UI, fontSize: 12.5, color: C.sub, marginTop: 3, marginBottom: 12 }}>
                  {s.artist || "Unknown"}
                  {s.category ? ` · ${s.category}` : ""}
                </div>
                <div style={{ marginTop: "auto", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  {trashView ? (
                    <>
                      <Btn size="sm" variant="ghost" onClick={() => restoreSong(s.id)}>
                        <RotateCcw size={13} />
                        Restore
                      </Btn>
                      <Btn size="sm" variant="danger" onClick={() => deleteSong(s.id)}>
                        <Trash2 size={13} />
                        Delete
                      </Btn>
                    </>
                  ) : (
                    <>
                      <Btn size="sm" variant="primary" onClick={() => startPresent(s.id)}>
                        <Play size={13} />
                        Present
                      </Btn>
                      <Btn size="sm" variant="ghost" onClick={() => navigate(`/editor/${s.id}`)}>
                        <Pencil size={13} />
                        Edit
                      </Btn>
                      {!s.builtIn && (
                        <div style={{ marginLeft: "auto" }}>
                          <IconBtn icon={Trash2} title="Move to trash" danger onClick={() => trashSong(s.id)} />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
