import { useState } from "react";
import { Settings2, Type } from "lucide-react";
import type { Manuscript, ManuscriptFormat } from "../../types";
import { useUITheme } from "../../theme/ThemeProvider";
import { DEFAULT_COLLECTION } from "../../data/collections";
import { useStore } from "../../store/useStore";
import { Button, IconButton } from "../../components/ui/Button";
import { useDeckEditor } from "../editor/useDeckEditor";
import { DeckWorkspace } from "../editor/DeckWorkspace";
import { ManuscriptTextModal } from "./ManuscriptTextModal";
import { ManuscriptSettingsModal } from "./ManuscriptSettingsModal";
import { parseManuscript } from "../../lib/parser";
import { resolveManuscriptFormat } from "../../lib/manuscript/format";
import { manuscriptSlideElements } from "../../lib/slideElements";
import { isUntitledManuscript } from "../../store/slices/manuscriptsSlice";

export const ManuscriptWorkspace = ({
  manuscript,
}: {
  manuscript: Manuscript;
}) => {
  const { colors, fonts } = useUITheme();
  const upsertManuscript = useStore((s) => s.upsertManuscript);
  const themes = useStore((s) => s.themes);
  const backgrounds = useStore((s) => s.backgrounds);
  const audio = useStore((s) => s.audio);

  const editor = useDeckEditor(manuscript, upsertManuscript);
  const [textOpen, setTextOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const draft = editor.doc;
  const theme = themes.find((t) => t.id === draft.defaultThemeId) || themes[0];

  const regenerateFromBody = (
    body: string,
    maxLines: number,
    format: ManuscriptFormat,
  ) => {
    const { title, author, collection, slides } = parseManuscript(body, {
      maxLines,
      format,
    });
    const changes: Partial<Manuscript> = { body, maxLines, format, slides };
    if (title && isUntitledManuscript(draft.title)) changes.title = title;
    if (author && !draft.author?.trim()) changes.author = author;
    if (
      collection &&
      (!draft.collection || draft.collection === DEFAULT_COLLECTION)
    )
      changes.collection = collection;
    editor.patchDoc(changes);
    editor.setSelectedId(slides[0]?.id ?? null);
  };

  return (
    <DeckWorkspace
      doc={draft}
      kind="manuscript"
      editor={editor}
      backTo="/manuscripts"
      backTitle="Back to manuscripts"
      elements={manuscriptSlideElements(resolveManuscriptFormat(draft))}
      topBarActions={(compact) =>
        compact ? (
          <>
            <IconButton
              icon={Type}
              title="Edit text"
              onClick={() => setTextOpen(true)}
            />
            <IconButton
              icon={Settings2}
              title="Manuscript settings"
              onClick={() => setSettingsOpen(true)}
            />
          </>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={() => setTextOpen(true)}>
              <Type size={14} />
              Text
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings2 size={14} />
              Manuscript Settings
            </Button>
          </>
        )
      }
      emptyState={
        <div
          style={{
            height: "100%",
            display: "grid",
            placeItems: "center",
            padding: 24,
          }}
        >
          <div style={{ textAlign: "center", maxWidth: 320 }}>
            <p
              style={{
                fontFamily: fonts.ui,
                color: colors.sub,
                lineHeight: 1.6,
              }}
            >
              This manuscript has no slides yet.
            </p>
            <Button variant="primary" onClick={() => setTextOpen(true)}>
              <Type size={15} />
              Edit text
            </Button>
          </div>
        </div>
      }
    >
      <ManuscriptTextModal
        open={textOpen}
        onClose={() => setTextOpen(false)}
        manuscript={draft}
        onRegenerate={regenerateFromBody}
      />
      <ManuscriptSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        manuscript={draft}
        theme={theme}
        themes={themes}
        backgrounds={backgrounds}
        audio={audio}
        onPatchManuscript={(changes) => editor.patchDoc(changes)}
        onStyleChange={editor.updateDocStyle}
      />
    </DeckWorkspace>
  );
};
