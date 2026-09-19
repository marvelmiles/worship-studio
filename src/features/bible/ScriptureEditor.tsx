import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, Settings2 } from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import { useStore } from "../../store/useStore";
import { Button, IconButton } from "../../components/ui/Button";
import { useDeckEditor } from "../editor/useDeckEditor";
import { useOpenAssetUsageEditor } from "../assets/assetUsageEdit";
import { DeckWorkspace } from "../editor/DeckWorkspace";
import { PassageSettingsModal } from "./PassageSettingsModal";
import {
  buildScriptureSlides,
  slideIndexForVerse,
} from "./lib/scriptureSlides";
import type { SlideTextMetrics } from "../../lib/slideLayout";
import routes from "../../routes";

const sameLines = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((line, index) => line === b[index]);

export const ScriptureEditor = () => {
  const { colors, fonts } = useUITheme();
  const { passageId } = useParams();
  const navigate = useNavigate();
  const passage = useStore((s) =>
    s.scriptures.find((item) => item.id === passageId),
  );

  if (!passage) {
    return (
      <div
        style={{
          height: "100%",
          display: "grid",
          placeItems: "center",
          padding: 24,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontFamily: fonts.display, color: colors.text }}>
            Passage not found
          </h2>
          <p style={{ fontFamily: fonts.ui, color: colors.sub }}>
            It may have been deleted.
          </p>
          <Button variant="primary" onClick={() => navigate(routes.bible())}>
            <ArrowLeft size={15} />
            Back to Bible
          </Button>
        </div>
      </div>
    );
  }

  return <ScriptureWorkspace key={passage.id} passageId={passage.id} />;
};

const ScriptureWorkspace = ({ passageId }: { passageId: string }) => {
  const { colors, fonts } = useUITheme();
  const current = useStore((s) =>
    s.scriptures.find((item) => item.id === passageId),
  );
  const upsertScripture = useStore((s) => s.upsertScripture);
  const lastRef = useRef(current);
  if (current) lastRef.current = current;
  const passage = lastRef.current;
  const editor = useDeckEditor(passage!, upsertScripture);
  const openAssetUsage = useOpenAssetUsageEditor({
    kind: "scripture",
    doc: editor.doc,
    editor,
  });
  const [settingsOpen, setSettingsOpen] = useState(false);

  const startPresent = useStore((s) => s.startPresent);
  const ctrlNumBuffer = useRef("");
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && /^[0-9]$/.test(e.key)) {
        e.preventDefault();
        ctrlNumBuffer.current += e.key;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key !== "Control") return;
      const buf = ctrlNumBuffer.current;
      ctrlNumBuffer.current = "";
      const target = lastRef.current;
      if (!buf || !target || useStore.getState().presentation) return;
      const index = slideIndexForVerse(target, parseInt(buf, 10));
      if (index >= 0 && target.slides?.[index])
        startPresent("scripture", target.id, index);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [startPresent]);
  if (!passage) return null;

  const draft = editor.doc;

  /* A passage is built from its verses rather than from written lines, so a new
     text size re-cuts it from those: a long verse can then be broken across
     slides instead of overflowing one. */
  const refitFromVerses = (metrics: SlideTextMetrics): boolean => {
    const next = buildScriptureSlides({
      version: draft.version,
      range: draft.range,
      verses: draft.verses,
      versesPerSlide: draft.versesPerSlide,
      showVerseNumbers: draft.showVerseNumbers,
      showReference: draft.showReference,
      splitLongVerses: Boolean(draft.quick),
      style: metrics,
    });
    const unchanged =
      next.length === draft.slides.length &&
      next.every((slide, index) =>
        sameLines(slide.lines, draft.slides[index].lines),
      );
    if (unchanged) return false;
    editor.setSlides(next);
    editor.setSelectedId(next[0]?.id ?? null);
    return true;
  };

  return (
    <DeckWorkspace
      doc={draft}
      kind="scripture"
      editor={editor}
      backTo={routes.bible()}
      backTitle="Back to Bible"
      refit={refitFromVerses}
      topBarActions={(compact) =>
        compact ? (
          <IconButton
            icon={Settings2}
            title="Passage settings"
            onClick={() => setSettingsOpen(true)}
          />
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings2 size={14} />
            Passage Settings
          </Button>
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
            <BookOpen
              size={30}
              color={colors.dim}
              style={{ margin: "0 auto 10px" }}
            />
            <p
              style={{
                fontFamily: fonts.ui,
                color: colors.sub,
                lineHeight: 1.6,
              }}
            >
              This passage has no slides yet.
            </p>
            <Button variant="primary" onClick={() => setSettingsOpen(true)}>
              <Settings2 size={15} />
              Passage settings
            </Button>
          </div>
        </div>
      }
    >
      <PassageSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        passage={draft}
        editor={editor}
        onEditAsset={(request) =>
          openAssetUsage(request, { label: "this passage", slideId: null })
        }
      />
    </DeckWorkspace>
  );
};
