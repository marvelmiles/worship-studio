import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Music, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { colors, CATEGORIES, UI } from "../../theme/tokens";
import { useStore } from "../../store/useStore";
import { useBgMap } from "../../hooks/useBgMap";
import { resolveLineStyle, resolveStyle } from "../../lib/resolve";
import { SlideCanvas } from "../../components/SlideCanvas";
import { BgSwatch } from "../../components/controls/BgSwatch";
import { Button, IconButton } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { PillTabs } from "../../components/ui/PillTabs";
import { SearchInput } from "../../components/ui/SearchInput";
import { EmptyState } from "../../components/ui/EmptyState";
import {
  KeepOnResetBadge,
  KeepOnResetToggle,
} from "../../components/ui/KeepOnResetToggle";
import { PresentMenu } from "../../components/ui/PresentMenu";
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

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [trashView, setTrashView] = useState(false);

  const onNew = () => {
    const created = createSong();
    if (created) navigate(`/songs/${created.id}`);
  };

  const list = useMemo(() => {
    let base = songs.filter((s) => (trashView ? s.deleted : !s.deleted));
    if (category !== "All") base = base.filter((s) => s.category === category);
    const term = query.trim().toLowerCase();
    if (term)
      base = base.filter((s) =>
        [s.title, s.artist, s.category, s.lyrics]
          .filter(Boolean)
          .some((f) => (f as string).toLowerCase().includes(term)),
      );
    return base.sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1));
  }, [songs, query, category, trashView]);

  return (
    <div className="ws-page">
      <PageHeader
        title={trashView ? "Trash" : "Songs"}
        subtitle={
          trashView
            ? undefined
            : "Lyrics turned into styled, presentable slides."
        }
        actions={
          <>
            <Button
              variant={trashView ? "primary" : "ghost"}
              onClick={() => setTrashView(!trashView)}
            >
              <Trash2 size={15} />
              {trashView ? "Songs" : "Trash"}
            </Button>
            {!trashView && (
              <Button variant="primary" onClick={onNew}>
                <Plus size={16} />
                New Song
              </Button>
            )}
          </>
        }
      />

      {!trashView && (
        <div className="ws-row-wrap" style={{ marginBottom: 18 }}>
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search by title, artist, lyrics…"
          />
          <PillTabs
            tabs={["All", ...CATEGORIES].map((c) => ({ id: c, label: c }))}
            value={category}
            onChange={setCategory}
          />
        </div>
      )}

      {list.length === 0 &&
        (trashView ? (
          <EmptyState
            icon={Trash2}
            title="Trash is empty"
            message="Songs you delete are kept here until you remove them for good."
          />
        ) : query.trim() || category !== "All" ? (
          <EmptyState
            icon={Music}
            title="No songs match"
            message="Try a different search or switch category."
          />
        ) : (
          <EmptyState
            icon={Music}
            title="No songs yet"
            message="Create your first song and its lyrics will turn into styled slides, ready to present."
            action={
              <Button variant="primary" onClick={onNew}>
                <Plus size={15} />
                New Song
              </Button>
            }
          />
        ))}

      <div className="ws-card-grid">
        {list.map((s) => {
          const first = s.slides?.[0];
          const theme =
            themes.find((t) => t.id === s.defaultThemeId) || themes[0];
          const bg =
            bgMap[s.defaultBackgroundId || theme.backgroundId] ||
            backgrounds[0];
          return (
            <div key={s.id} className="ws-glass ws-card">
              <div
                onClick={() => !trashView && navigate(`/songs/${s.id}`)}
                style={{
                  cursor: trashView ? "default" : "pointer",
                  position: "relative",
                }}
              >
                {first ? (
                  <SlideCanvas
                    slide={first}
                    bg={bg}
                    radius={0}
                    style={resolveStyle(first, s, theme)}
                    lineStyles={first.lines.map((_, i) =>
                      resolveLineStyle(first, i, s, theme),
                    )}
                  />
                ) : (
                  <BgSwatch bg={bg} style={{ aspectRatio: "16/9" }} />
                )}
                <div className="ws-thumb-badge">
                  {s.slides?.length || 0} slides
                </div>
              </div>
              <div className="ws-card-body">
                <div className="ws-card-title">
                  {s.title}
                  <KeepOnResetBadge item={s} />
                  {s.builtIn && (
                    <span
                      style={{
                        fontFamily: UI,
                        fontSize: 10,
                        fontWeight: 700,
                        color: colors.dim,
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
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => restoreSong(s.id)}
                      >
                        <RotateCcw size={13} />
                        Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => deleteSong(s.id)}
                      >
                        <Trash2 size={13} />
                        Delete
                      </Button>
                    </>
                  ) : (
                    <>
                      <PresentMenu
                        onPresent={({ pip }) =>
                          startPresent("song", s.id, 0, pip ? "pip" : "stage")
                        }
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/songs/${s.id}`)}
                      >
                        <Pencil size={13} />
                        Edit
                      </Button>
                      {!s.builtIn && (
                        <div
                          style={{
                            marginLeft: "auto",
                            display: "flex",
                            gap: 2,
                          }}
                        >
                          <KeepOnResetToggle kind="song" item={s} />
                          <IconButton
                            icon={Trash2}
                            title="Move to trash"
                            danger
                            onClick={() => trashSong(s.id)}
                          />
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
