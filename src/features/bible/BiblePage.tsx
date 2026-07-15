import { useEffect, useState } from "react";
import { BookOpen, Bookmark, Trash2 } from "lucide-react";
import { C } from "../../theme/tokens";
import { useStore } from "../../store/useStore";
import { useViewport } from "../../hooks/useViewport";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { PageHeader } from "../../components/ui/PageHeader";
import { PillTabs } from "../../components/ui/PillTabs";
import { Btn } from "../../components/ui/Button";
import { BibleNavigator } from "./BibleNavigator";
import { BibleReader } from "./BibleReader";
import { SavedPassages } from "./SavedPassages";

type BibleTab = "read" | "saved";

const POSITION_KEY = "ws:bible-position";

interface ReadingPosition {
  bookId: number;
  chapter: number;
}

function loadPosition(): ReadingPosition {
  try {
    const raw = localStorage.getItem(POSITION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ReadingPosition;
      if (parsed.bookId >= 1 && parsed.bookId <= 66 && parsed.chapter >= 1) return parsed;
    }
  } catch {
    /* fall back to default */
  }
  return { bookId: 43, chapter: 3 };
}

export function BiblePage() {
  useDocumentTitle("Bible · WorshipStudio");
  const { width } = useViewport();
  const compact = width < 900;

  const prefs = useStore((s) => s.prefs);
  const setBibleVersion = useStore((s) => s.setBibleVersion);
  const scriptures = useStore((s) => s.scriptures);

  const [tab, setTab] = useState<BibleTab>("read");
  const [trashView, setTrashView] = useState(false);
  const [position, setPosition] = useState<ReadingPosition>(loadPosition);

  useEffect(() => {
    try {
      localStorage.setItem(POSITION_KEY, JSON.stringify(position));
    } catch {
      /* non-fatal */
    }
  }, [position]);

  const savedCount = scriptures.filter((s) => !s.quick && !s.deleted).length;
  const navigate = (bookId: number, chapter: number) => setPosition({ bookId, chapter });

  return (
    <div className="ws-page" style={{ display: "flex", flexDirection: "column", height: "100%", maxHeight: "100%" }}>
      <PageHeader
        title="Bible"
        subtitle="Read, project and save scripture — KJV, NKJV, NIV, ESV and NLT."
        actions={
          <>
            <PillTabs<BibleTab>
              tabs={[
                { id: "read", label: "Read", icon: BookOpen },
                { id: "saved", label: `Saved (${savedCount})`, icon: Bookmark },
              ]}
              value={tab}
              onChange={(next) => {
                setTab(next);
                if (next === "read") setTrashView(false);
              }}
            />
            {tab === "saved" && (
              <Btn variant={trashView ? "primary" : "ghost"} onClick={() => setTrashView((v) => !v)}>
                <Trash2 size={15} />
                {trashView ? "Passages" : "Trash"}
              </Btn>
            )}
          </>
        }
      />

      {tab === "read" ? (
        compact ? (
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <BibleNavigator
              version={prefs.bibleVersion}
              bookId={position.bookId}
              chapter={position.chapter}
              onVersion={setBibleVersion}
              onNavigate={navigate}
              compact
            />
            <div style={{ flex: 1, minHeight: 0 }}>
              <BibleReader
                version={prefs.bibleVersion}
                bookId={position.bookId}
                chapter={position.chapter}
                onNavigate={navigate}
              />
            </div>
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "grid",
              gridTemplateColumns: "272px 1fr",
              gap: 22,
            }}
          >
            <div
              style={{
                minHeight: 0,
                borderRight: `1px solid ${C.border}`,
                paddingRight: 18,
              }}
            >
              <BibleNavigator
                version={prefs.bibleVersion}
                bookId={position.bookId}
                chapter={position.chapter}
                onVersion={setBibleVersion}
                onNavigate={navigate}
                compact={false}
              />
            </div>
            <div style={{ minHeight: 0 }}>
              <BibleReader
                version={prefs.bibleVersion}
                bookId={position.bookId}
                chapter={position.chapter}
                onNavigate={navigate}
              />
            </div>
          </div>
        )
      ) : (
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          <SavedPassages trashView={trashView} />
        </div>
      )}
    </div>
  );
}
