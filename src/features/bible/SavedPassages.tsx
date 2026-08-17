import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Pencil, RotateCcw, Trash2 } from "lucide-react";
import type { ScripturePassage, Theme } from "../../types";
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
import { Button } from "../../components/ui/Button";
import { SearchInput } from "../../components/ui/SearchInput";
import { EmptyState } from "../../components/ui/EmptyState";
import { MoreMenu } from "../../components/ui/MoreMenu";
import { PinBadge, usePinAction } from "../../components/ui/PinControl";
import { PresentMenu } from "../../components/ui/PresentMenu";

export function SavedPassages({ trashView }: { trashView: boolean }) {
  const navigate = useNavigate();
  const scriptures = useStore((s) => s.scriptures);
  const themes = useStore((s) => s.themes);
  const startPresent = useStore((s) => s.startPresent);
  const trashScripture = useStore((s) => s.trashScripture);
  const restoreScripture = useStore((s) => s.restoreScripture);
  const deleteScripture = useStore((s) => s.deleteScripture);
  const bgMap = useBgMap();

  const [query, setQuery] = useState("");

  const saved = useMemo(
    () => scriptures.filter((passage) => !passage.quick),
    [scriptures],
  );

  const list = useMemo(() => {
    let base = saved.filter((s) => (trashView ? s.deleted : !s.deleted));
    const term = query.trim().toLowerCase();
    if (term) {
      base = base.filter((s) =>
        [s.title, s.version, s.range.bookName].some((f) =>
          f.toLowerCase().includes(term),
        ),
      );
    }
    const ordered = base.sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1));
    // A search is answered by what matches it; pins only order the library.
    return term || trashView ? ordered : sortPinnedFirst(ordered);
  }, [saved, query, trashView]);

  return (
    <>
      {!trashView && (
        <div className="ws-row-wrap" style={{ marginBottom: 18 }}>
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search saved passages…"
          />
        </div>
      )}

      {list.length === 0 ? (
        trashView ? (
          <EmptyState
            icon={Trash2}
            title="Trash is empty"
            message="Passages you delete are kept here until you remove them for good."
          />
        ) : (
          <EmptyState
            icon={BookOpen}
            title="No saved passages yet"
            message="Select verses in the reader and save them as styled slides you can present any time."
          />
        )
      ) : (
        <div className="ws-card-grid">
          {list.map((passage) => (
            <PassageCard
              key={passage.id}
              passage={passage}
              library={saved}
              themes={themes}
              bgMap={bgMap}
              trashView={trashView}
              onOpen={() => navigate(`/scripture/${passage.id}`)}
              onPresent={(pip) =>
                startPresent("scripture", passage.id, 0, pip ? "pip" : "stage")
              }
              onTrash={() => trashScripture(passage.id)}
              onRestore={() => restoreScripture(passage.id)}
              onDelete={() => deleteScripture(passage.id)}
            />
          ))}
        </div>
      )}
    </>
  );
}

interface PassageCardProps {
  passage: ScripturePassage;
  /** Every saved passage, so the pin budget can be read off the library. */
  library: ScripturePassage[];
  themes: Theme[];
  bgMap: BgMap;
  trashView: boolean;
  onOpen: () => void;
  onPresent: (pip: boolean) => void;
  onTrash: () => void;
  onRestore: () => void;
  onDelete: () => void;
}

function PassageCard({
  passage,
  library,
  themes,
  bgMap,
  trashView,
  onOpen,
  onPresent,
  onTrash,
  onRestore,
  onDelete,
}: PassageCardProps) {
  const pinAction = usePinAction("scripture", passage, library);

  const first = passage.slides?.[0];
  const theme =
    themes.find((t) => t.id === passage.defaultThemeId) || themes[0];
  const background = resolveBackgroundView(first, passage, theme, bgMap);

  return (
    <div className="ws-glass ws-card">
      <div
        onClick={() => !trashView && onOpen()}
        style={{
          cursor: trashView ? "default" : "pointer",
          position: "relative",
        }}
      >
        {first && (
          <SlideCanvas
            slide={first}
            bg={background.background}
            bgImage={background.image}
            radius={0}
            style={resolveStyle(first, passage, theme)}
            lineStyles={first.lines.map((_, i) =>
              resolveLineStyle(first, i, passage, theme),
            )}
          />
        )}
        <div className="ws-thumb-badge">
          {passage.slides?.length || 0} slides
        </div>
      </div>
      <div className="ws-card-body">
        <div className="ws-card-title">
          <span className="ws-ellipsis">{passage.title}</span>
          {!trashView && <PinBadge item={passage} />}
        </div>
        <div className="ws-card-sub">
          {passage.version} · {passage.verses.length} verse
          {passage.verses.length === 1 ? "" : "s"}
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
                <MoreMenu
                  items={[
                    pinAction,
                    { divider: true },
                    {
                      label: "Move to trash",
                      icon: Trash2,
                      danger: true,
                      onClick: onTrash,
                    },
                  ]}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
