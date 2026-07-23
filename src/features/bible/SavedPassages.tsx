import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useStore } from "../../store/useStore";
import { useBgMap } from "../../hooks/useBgMap";
import {
  resolveBackground,
  resolveLineStyle,
  resolveStyle,
} from "../../lib/resolve";
import { SlideCanvas } from "../../components/SlideCanvas";
import { Button, IconButton } from "../../components/ui/Button";
import { SearchInput } from "../../components/ui/SearchInput";
import { EmptyState } from "../../components/ui/EmptyState";
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

  const list = useMemo(() => {
    let base = scriptures.filter(
      (s) => !s.quick && (trashView ? s.deleted : !s.deleted),
    );
    const term = query.trim().toLowerCase();
    if (term) {
      base = base.filter((s) =>
        [s.title, s.version, s.range.bookName].some((f) =>
          f.toLowerCase().includes(term),
        ),
      );
    }
    return base.sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1));
  }, [scriptures, query, trashView]);

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
          {list.map((passage) => {
            const first = passage.slides?.[0];
            const theme =
              themes.find((t) => t.id === passage.defaultThemeId) || themes[0];
            return (
              <div key={passage.id} className="ws-glass ws-card">
                <div
                  onClick={() =>
                    !trashView && navigate(`/scripture/${passage.id}`)
                  }
                  style={{
                    cursor: trashView ? "default" : "pointer",
                    position: "relative",
                  }}
                >
                  {first && (
                    <SlideCanvas
                      slide={first}
                      bg={resolveBackground(first, passage, theme, bgMap)}
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
                  <div className="ws-card-title">{passage.title}</div>
                  <div className="ws-card-sub">
                    {passage.version} · {passage.verses.length} verse
                    {passage.verses.length === 1 ? "" : "s"}
                  </div>
                  <div className="ws-card-actions">
                    {trashView ? (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => restoreScripture(passage.id)}
                        >
                          <RotateCcw size={13} />
                          Restore
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => deleteScripture(passage.id)}
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
                              "scripture",
                              passage.id,
                              0,
                              pip ? "pip" : "stage",
                            )
                          }
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/scripture/${passage.id}`)}
                        >
                          <Pencil size={13} />
                          Edit
                        </Button>
                        <div style={{ marginLeft: "auto" }}>
                          <IconButton
                            icon={Trash2}
                            title="Move to trash"
                            danger
                            onClick={() => trashScripture(passage.id)}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
