import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { colors, UI } from "../../theme/tokens";
import { COLLECTIONS } from "../../data/collections";
import { useStore } from "../../store/useStore";
import { useBgMap } from "../../hooks/useBgMap";
import {
  resolveBackgroundImage,
  resolveLineStyle,
  resolveStyle,
} from "../../lib/resolve";
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

export function ManuscriptLibrary() {
  useDocumentTitle("Manuscripts · WorshipStudio");
  const navigate = useNavigate();
  const manuscripts = useStore((s) => s.manuscripts);
  const themes = useStore((s) => s.themes);
  const backgrounds = useStore((s) => s.backgrounds);
  const createManuscript = useStore((s) => s.createManuscript);
  const trashManuscript = useStore((s) => s.trashManuscript);
  const restoreManuscript = useStore((s) => s.restoreManuscript);
  const deleteManuscript = useStore((s) => s.deleteManuscript);
  const startPresent = useStore((s) => s.startPresent);
  const bgMap = useBgMap();

  const [query, setQuery] = useState("");
  const [collection, setCollection] = useState("All");
  const [trashView, setTrashView] = useState(false);

  const onNew = () => {
    const created = createManuscript();
    if (created) navigate(`/manuscripts/${created.id}`);
  };

  const list = useMemo(() => {
    let base = manuscripts.filter((m) => (trashView ? m.deleted : !m.deleted));
    if (collection !== "All")
      base = base.filter((m) => m.collection === collection);
    const term = query.trim().toLowerCase();
    if (term)
      base = base.filter((m) =>
        [m.title, m.author, m.collection, m.body]
          .filter(Boolean)
          .some((field) => (field as string).toLowerCase().includes(term)),
      );
    return base.sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1));
  }, [manuscripts, query, collection, trashView]);

  return (
    <div className="ws-page">
      <PageHeader
        title={trashView ? "Trash" : "Manuscripts"}
        subtitle={
          trashView
            ? undefined
            : "Lyrics, hymns and sermons turned into styled, presentable slides."
        }
        actions={
          <>
            <Button
              variant={trashView ? "primary" : "ghost"}
              onClick={() => setTrashView(!trashView)}
            >
              <Trash2 size={15} />
              {trashView ? "Manuscripts" : "Trash"}
            </Button>
            {!trashView && (
              <Button variant="primary" onClick={onNew}>
                <Plus size={16} />
                New Manuscript
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
            placeholder="Search by title, author, text…"
          />
          <PillTabs
            tabs={["All", ...COLLECTIONS].map((c) => ({ id: c, label: c }))}
            value={collection}
            onChange={setCollection}
          />
        </div>
      )}

      {list.length === 0 &&
        (trashView ? (
          <EmptyState
            icon={Trash2}
            title="Trash is empty"
            message="Manuscripts you delete are kept here until you remove them for good."
          />
        ) : query.trim() || collection !== "All" ? (
          <EmptyState
            icon={FileText}
            title="No manuscripts match"
            message="Try a different search or switch collection."
          />
        ) : (
          <EmptyState
            icon={FileText}
            title="No manuscripts yet"
            message="Create your first manuscript and its text will turn into styled slides, ready to present."
            action={
              <Button variant="primary" onClick={onNew}>
                <Plus size={15} />
                New Manuscript
              </Button>
            }
          />
        ))}

      <div className="ws-card-grid">
        {list.map((m) => {
          const first = m.slides?.[0];
          const theme =
            themes.find((t) => t.id === m.defaultThemeId) || themes[0];
          const bg =
            bgMap[m.defaultBackgroundId || theme.backgroundId] ||
            backgrounds[0];
          const bgImage = resolveBackgroundImage(first, m, bg);
          return (
            <div key={m.id} className="ws-glass ws-card">
              <div
                onClick={() => !trashView && navigate(`/manuscripts/${m.id}`)}
                style={{
                  cursor: trashView ? "default" : "pointer",
                  position: "relative",
                }}
              >
                {first ? (
                  <SlideCanvas
                    slide={first}
                    bg={bg}
                    bgImage={bgImage}
                    radius={0}
                    style={resolveStyle(first, m, theme)}
                    lineStyles={first.lines.map((_, i) =>
                      resolveLineStyle(first, i, m, theme),
                    )}
                  />
                ) : (
                  <BgSwatch
                    bg={bg}
                    settings={bgImage}
                    style={{ aspectRatio: "16/9" }}
                  />
                )}
                <div className="ws-thumb-badge">
                  {m.slides?.length || 0} slides
                </div>
              </div>
              <div className="ws-card-body">
                <div className="ws-card-title">
                  {m.title}
                  <KeepOnResetBadge item={m} />
                  {m.builtIn && (
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
                  {m.author || "Unknown"}
                  {m.collection ? ` · ${m.collection}` : ""}
                </div>
                <div className="ws-card-actions">
                  {trashView ? (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => restoreManuscript(m.id)}
                      >
                        <RotateCcw size={13} />
                        Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => deleteManuscript(m.id)}
                      >
                        <Trash2 size={13} />
                        Delete
                      </Button>
                    </>
                  ) : (
                    <>
                      <PresentMenu
                        onPresent={({ pip }) =>
                          startPresent(
                            "manuscript",
                            m.id,
                            0,
                            pip ? "pip" : "stage",
                          )
                        }
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/manuscripts/${m.id}`)}
                      >
                        <Pencil size={13} />
                        Edit
                      </Button>
                      {!m.builtIn && (
                        <div
                          style={{
                            marginLeft: "auto",
                            display: "flex",
                            gap: 2,
                          }}
                        >
                          <KeepOnResetToggle kind="manuscript" item={m} />
                          <IconButton
                            icon={Trash2}
                            title="Move to trash"
                            danger
                            onClick={() => trashManuscript(m.id)}
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
