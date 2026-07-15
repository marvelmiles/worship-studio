import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, Settings2 } from "lucide-react";
import { C, DISPLAY, UI } from "../../theme/tokens";
import { useStore } from "../../store/useStore";
import { Btn, IconBtn } from "../../components/ui/Button";
import { useDeckEditor } from "../editor/useDeckEditor";
import { DeckWorkspace } from "../editor/DeckWorkspace";
import { PassageSettingsModal } from "./PassageSettingsModal";
import { slideIndexForVerse } from "./lib/scriptureSlides";

export function ScriptureEditor() {
  const { passageId } = useParams();
  const navigate = useNavigate();
  const passage = useStore((s) => s.scriptures.find((item) => item.id === passageId));

  if (!passage) {
    return (
      <div style={{ height: "100%", display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontFamily: DISPLAY, color: C.text }}>Passage not found</h2>
          <p style={{ fontFamily: UI, color: C.sub }}>It may have been deleted.</p>
          <Btn variant="primary" onClick={() => navigate("/bible")}>
            <ArrowLeft size={15} />
            Back to Bible
          </Btn>
        </div>
      </div>
    );
  }

  return <ScriptureWorkspace key={passage.id} passageId={passage.id} />;
}

function ScriptureWorkspace({ passageId }: { passageId: string }) {
  const current = useStore((s) => s.scriptures.find((item) => item.id === passageId));
  const upsertScripture = useStore((s) => s.upsertScripture);
  // Keeps the last known copy so a mid-edit deletion unmounts cleanly instead of crashing.
  const lastRef = useRef(current);
  if (current) lastRef.current = current;
  const passage = lastRef.current;
  const editor = useDeckEditor(passage!, upsertScripture);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const startPresent = useStore((s) => s.startPresent);
  // Ctrl+<verse number> presents starting at the slide holding that verse.
  // Digits accumulate while Ctrl is held and flush on Ctrl keyup (Ctrl+1,
  // Ctrl+100…), matching the in-presentation shortcut behaviour.
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
      // While a presentation is already live its own shortcut handling wins.
      if (!buf || !target || useStore.getState().presentation) return;
      const index = slideIndexForVerse(target.verses, target.versesPerSlide, parseInt(buf, 10));
      if (index >= 0 && target.slides?.[index]) startPresent("scripture", target.id, index);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [startPresent]);
  if (!passage) return null;

  return (
    <DeckWorkspace
      doc={passage}
      kind="scripture"
      editor={editor}
      backTo="/bible"
      backTitle="Back to Bible"
      topBarActions={(compact) =>
        compact ? (
          <IconBtn icon={Settings2} title="Passage settings" onClick={() => setSettingsOpen(true)} />
        ) : (
          <Btn variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}>
            <Settings2 size={14} />
            Passage Settings
          </Btn>
        )
      }
      emptyState={
        <div style={{ height: "100%", display: "grid", placeItems: "center", padding: 24 }}>
          <div style={{ textAlign: "center", maxWidth: 320 }}>
            <BookOpen size={30} color={C.dim} style={{ margin: "0 auto 10px" }} />
            <p style={{ fontFamily: UI, color: C.sub, lineHeight: 1.6 }}>
              This passage has no slides. Open passage settings to rebuild them from the verses.
            </p>
            <Btn variant="primary" onClick={() => setSettingsOpen(true)}>
              <Settings2 size={15} />
              Passage settings
            </Btn>
          </div>
        </div>
      }
    >
      <PassageSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        passage={passage}
        editor={editor}
      />
    </DeckWorkspace>
  );
}
