import { useState } from "react";
import { RotateCcw, Settings2, Type } from "lucide-react";
import type { Manuscript, ManuscriptFormat } from "../../types";
import { useUITheme } from "../../theme/ThemeProvider";
import { DEFAULT_COLLECTION } from "../../data/collections";
import { useStore } from "../../store/useStore";
import { Button, IconButton } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { useDeckEditor } from "../editor/useDeckEditor";
import { useOpenAssetUsageEditor } from "../assets/assetUsageEdit";
import { DeckWorkspace } from "../editor/DeckWorkspace";
import { ManuscriptTextModal } from "./ManuscriptTextModal";
import { ManuscriptSettingsModal } from "./ManuscriptSettingsModal";
import { parseManuscript } from "../../lib/parser";
import { resolveStyle } from "../../lib/resolve";
import { resolveManuscriptFormat } from "../../lib/manuscript/format";
import { manuscriptSlideElements } from "../../lib/slideElements";
import { isUntitledManuscript } from "../../store/slices/manuscriptsSlice";
import routes from "../../routes";

const RESET_TITLE =
  "Put this default manuscript back to the text, slides and styling it shipped with";

const DRAFT_LEAVE_MESSAGE =
  "This manuscript has not been saved yet. If you leave now it is not added to your library.";

interface ManuscriptWorkspaceProps {
  manuscript: Manuscript;
  /** True while the manuscript is still a draft that has never been saved. */
  unsaved?: boolean;
}

export const ManuscriptWorkspace = ({
  manuscript,
  unsaved,
}: ManuscriptWorkspaceProps) => {
  const { colors, fonts } = useUITheme();
  const upsertManuscript = useStore((s) => s.upsertManuscript);
  const defaultManuscriptFor = useStore((s) => s.defaultManuscriptFor);
  const pushToast = useStore((s) => s.pushToast);
  const themes = useStore((s) => s.themes);
  const backgrounds = useStore((s) => s.backgrounds);
  const audio = useStore((s) => s.audio);

  const editor = useDeckEditor(manuscript, upsertManuscript);
  const openAssetUsage = useOpenAssetUsageEditor({
    kind: "manuscript",
    doc: editor.doc,
    editor,
  });
  const [textOpen, setTextOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

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
      style: resolveStyle(undefined, draft, theme),
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

  /* Staged like any other edit, so Save still decides and undo can take it
     back. */
  const resetToDefault = async () => {
    setConfirmReset(false);
    const defaults = await defaultManuscriptFor(draft.id);
    if (!defaults) {
      pushToast(
        "This manuscript has no shipped version to go back to.",
        "error",
      );
      return;
    }
    editor.replaceDoc(defaults);
    pushToast(`"${defaults.title}" is back to its default. Save to keep it.`);
  };

  const resetAction = (compact: boolean) =>
    draft.builtIn ? (
      compact ? (
        <IconButton
          icon={RotateCcw}
          title={RESET_TITLE}
          onClick={() => setConfirmReset(true)}
        />
      ) : (
        <Button
          variant="ghost"
          size="sm"
          title={RESET_TITLE}
          onClick={() => setConfirmReset(true)}
        >
          <RotateCcw size={14} />
          Reset to default
        </Button>
      )
    ) : null;

  return (
    <DeckWorkspace
      doc={draft}
      kind="manuscript"
      editor={editor}
      backTo={routes.manuscripts()}
      backTitle="Back to manuscripts"
      elements={manuscriptSlideElements(resolveManuscriptFormat(draft))}
      reflow={{ maxLines: draft.maxLines }}
      unsavedMessage={unsaved ? DRAFT_LEAVE_MESSAGE : undefined}
      topBarActions={(compact) =>
        compact ? (
          <>
            {resetAction(true)}
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
            {resetAction(false)}
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
        theme={theme}
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
        onEditAsset={(request) =>
          openAssetUsage(request, {
            label: "this manuscript",
            slideId: null,
          })
        }
      />
      <ConfirmDialog
        open={confirmReset}
        title="Reset to default?"
        message={`"${draft.title}" goes back to the text, slides and styling it shipped with. Anything you changed here is replaced, and the reset only sticks once you save.`}
        confirmLabel="Reset to default"
        onConfirm={() => void resetToDefault()}
        onCancel={() => setConfirmReset(false)}
      />
    </DeckWorkspace>
  );
};
