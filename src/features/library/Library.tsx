import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Music, Pencil, Play, Plus, RotateCcw, Trash2 } from "lucide-react";
import { C, CATEGORIES, UI } from "../../theme/tokens";
import { useStore } from "../../store/useStore";
import { useBgMap } from "../../hooks/useBgMap";
import { resolveLineStyle, resolveStyle } from "../../lib/resolve";
import { SlideCanvas } from "../../components/SlideCanvas";
import { BgSwatch } from "../../components/controls/BgSwatch";
import { Btn, IconBtn } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { PillTabs } from "../../components/ui/PillTabs";
import { SearchInput } from "../../components/ui/SearchInput";
import { EmptyState } from "../../components/ui/EmptyState";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";

export function Library() {
  useDocumentTitle("Songs · WorshipStudio");
  const navigate = useNavigate();
  const songs = useStore((s) => s.songs);
  const themes = useStore((s) => s.themes);
  const backgrounds = useStore((s) => s.backgrounds);
  const createSong = useStore((s) => s.createSong);
  const trashSong = useStore((s) => s.trashSong);
  const restoreSong = useStore((s) => s.restoreSong);
  const deleteSong = useStore((s) => s.deleteSong);
  const startPresent = useStore((s) => s.startPresent);
  const bgMap = useBgMap();

  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [trashView, setTrashView] = useState(false);

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
    <div className="ws-page">
      <PageHeader
        title={trashView ? "Trash" : "Songs"}
        subtitle={trashView ? undefined : "Lyrics turned into styled, presentable slides."}
        actions={
          <>
            <Btn variant={trashView ? "primary" : "ghost"} onClick={() => setTrashView(!trashView)}>
              <Trash2 size={15} />
              {trashView ? "Songs" : "Trash"}
            </Btn>
            {!trashView && (
              <Btn variant="primary" onClick={onNew}>
                <Plus size={16} />
                New Song
              </Btn>
            )}
          </>
        }
      />

      {!trashView && (
        <div className="ws-row-wrap" style={{ marginBottom: 18 }}>
          <SearchInput value={q} onChange={setQ} placeholder="Search by title, artist, lyrics…" />
          <PillTabs
            tabs={["All", ...CATEGORIES].map((c) => ({ id: c, label: c }))}
            value={cat}
            onChange={setCat}
          />
        </div>
      )}

      {list.length === 0 && (
        <EmptyState
          icon={Music}
          message={trashView ? "Trash is empty." : "No songs match. Add one to get started."}
        />
      )}

      <div className="ws-card-grid">
        {list.map((s) => {
          const first = s.slides?.[0];
          const theme = themes.find((t) => t.id === s.defaultThemeId) || themes[0];
          const bg = bgMap[s.defaultBackgroundId || theme.backgroundId] || backgrounds[0];
          return (
            <div key={s.id} className="ws-glass ws-card">
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
                  <BgSwatch bg={bg} style={{ aspectRatio: "16/9" }} />
                )}
                <div className="ws-thumb-badge">{s.slides?.length || 0} slides</div>
              </div>
              <div className="ws-card-body">
                <div className="ws-card-title">
                  {s.title}
                  {s.builtIn && (
                    <span
                      style={{
                        fontFamily: UI,
                        fontSize: 10,
                        fontWeight: 700,
                        color: C.dim,
                        letterSpacing: 0.4,
                      }}
                    >
                      DEFAULT
                    </span>
                  )}
                </div>
                <div className="ws-card-sub">
                  {s.artist || "Unknown"}
                  {s.category ? ` · ${s.category}` : ""}
                </div>
                <div className="ws-card-actions">
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
                      <Btn size="sm" variant="primary" onClick={() => startPresent("song", s.id)}>
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
