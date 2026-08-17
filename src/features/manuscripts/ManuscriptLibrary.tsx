import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import type { Manuscript, Theme } from "../../types";
import { colors, UI } from "../../theme/tokens";
import { COLLECTIONS } from "../../data/collections";
import { useStore } from "../../store/useStore";
import { useBgMap } from "../../hooks/useBgMap";
import type { BgMap } from "../../hooks/useBgMap";
import { sortPinnedFirst } from "../../lib/pinning";
import {
  resolveBackgroundView,
  resolveLineStyle,
  resolveStyle,
} from "../../lib/resolve";
import { SlideCanvas } from "../../components/SlideCanvas";
import { BgSwatch } from "../../components/controls/BgSwatch";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { PillTabs } from "../../components/ui/PillTabs";
import { SearchInput } from "../../components/ui/SearchInput";
import { EmptyState } from "../../components/ui/EmptyState";
import { MoreMenu } from "../../components/ui/MoreMenu";
import type { MoreMenuItem } from "../../components/ui/MoreMenu";
import {
  KeepOnResetBadge,
  useKeepOnResetAction,
} from "../../components/ui/KeepOnResetToggle";
import { PinBadge, usePinAction } from "../../components/ui/PinControl";
import { PresentMenu } from "../../components/ui/PresentMenu";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";

export function ManuscriptLibrary() {
  useDocumentTitle("Manuscripts · WorshipStudio");
  const navigate = useNavigate();
  const manuscripts = useStore((s) => s.manuscripts);
  const themes = useStore((s) => s.themes);
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

  const searching = Boolean(query.trim());

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
    const ordered = base.sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1));
    // A search is answered by what matches it; pins only order the library.
    return term || trashView ? ordered : sortPinnedFirst(ordered);
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
        ) : searching || collection !== "All" ? (
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
        {list.map((manuscript) => (
          <ManuscriptCard
            key={manuscript.id}
            manuscript={manuscript}
            library={manuscripts}
            themes={themes}
            bgMap={bgMap}
            trashView={trashView}
            onOpen={() => navigate(`/manuscripts/${manuscript.id}`)}
            onPresent={(pip) =>
              startPresent(
                "manuscript",
                manuscript.id,
                0,
                pip ? "pip" : "stage",
              )
            }
            onTrash={() => trashManuscript(manuscript.id)}
            onRestore={() => restoreManuscript(manuscript.id)}
            onDelete={() => deleteManuscript(manuscript.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface ManuscriptCardProps {
  manuscript: Manuscript;
  /** Every manuscript, so the pin budget can be read off the library. */
  library: Manuscript[];
  themes: Theme[];
  bgMap: BgMap;
  trashView: boolean;
  onOpen: () => void;
  onPresent: (pip: boolean) => void;
  onTrash: () => void;
  onRestore: () => void;
  onDelete: () => void;
}

function ManuscriptCard({
  manuscript,
  library,
  themes,
  bgMap,
  trashView,
  onOpen,
  onPresent,
  onTrash,
  onRestore,
  onDelete,
}: ManuscriptCardProps) {
  const pinAction = usePinAction("manuscript", manuscript, library);
  const keepAction = useKeepOnResetAction("manuscript", manuscript);

  const first = manuscript.slides?.[0];
  const theme =
    themes.find((t) => t.id === manuscript.defaultThemeId) || themes[0];
  // The cover shows the first slide as it will be projected, so the background
  // follows that slide's own choice before the manuscript's and the theme's.
  const { background, image } = resolveBackgroundView(
    first,
    manuscript,
    theme,
    bgMap,
  );

  const menuItems: MoreMenuItem[] = [
    pinAction,
    ...(keepAction ? [keepAction] : []),
    ...(manuscript.builtIn
      ? []
      : [
          { divider: true },
          {
            label: "Move to trash",
            icon: Trash2,
            danger: true,
            onClick: onTrash,
          },
        ]),
  ];

  return (
    <div className="ws-glass ws-card">
      <div
        onClick={() => !trashView && onOpen()}
        style={{
          cursor: trashView ? "default" : "pointer",
          position: "relative",
        }}
      >
        {first ? (
          <SlideCanvas
            slide={first}
            bg={background}
            bgImage={image}
            radius={0}
            style={resolveStyle(first, manuscript, theme)}
            lineStyles={first.lines.map((_, i) =>
              resolveLineStyle(first, i, manuscript, theme),
            )}
          />
        ) : (
          <BgSwatch
            bg={background}
            settings={image}
            style={{ aspectRatio: "16/9" }}
          />
        )}
        <div className="ws-thumb-badge">
          {manuscript.slides?.length || 0} slides
        </div>
      </div>
      <div className="ws-card-body">
        <div className="ws-card-title">
          <span className="ws-ellipsis">{manuscript.title}</span>
          {!trashView && <PinBadge item={manuscript} />}
          <KeepOnResetBadge item={manuscript} />
          {manuscript.builtIn && (
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
          {manuscript.author || "Unknown"}
          {manuscript.collection ? ` · ${manuscript.collection}` : ""}
        </div>
        <div className="ws-card-actions">
          {trashView ? (
            <>
              <Button size="sm" variant="ghost" onClick={onRestore}>
                <RotateCcw size={13} />
                Restore
              </Button>
              <Button size="sm" variant="danger" onClick={onDelete}>
                <Trash2 size={13} />
                Delete
              </Button>
            </>
          ) : (
            <>
              <PresentMenu onPresent={({ pip }) => onPresent(pip)} />
              <Button size="sm" variant="ghost" onClick={onOpen}>
                <Pencil size={13} />
                Edit
              </Button>
              <div style={{ marginLeft: "auto" }}>
                <MoreMenu items={menuItems} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
