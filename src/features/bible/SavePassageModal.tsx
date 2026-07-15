import { useState } from "react";
import { BookmarkPlus } from "lucide-react";
import type { ScriptureSelection } from "../../store/useStore";
import { C, UI } from "../../theme/tokens";
import { Modal } from "../../components/ui/Modal";
import { Btn } from "../../components/ui/Button";
import { Field, Range, Toggle } from "../../components/ui/Field";
import { formatReference } from "./lib/reference";

interface SavePassageModalProps {
  selection: ScriptureSelection | null;
  onClose: () => void;
  onSave: (versesPerSlide: number, showVerseNumbers: boolean, showReference: boolean) => void;
}

export function SavePassageModal({ selection, onClose, onSave }: SavePassageModalProps) {
  const [versesPerSlide, setVersesPerSlide] = useState(1);
  const [showVerseNumbers, setShowVerseNumbers] = useState(true);
  const [showReference, setShowReference] = useState(true);

  if (!selection) return null;
  const slideCount = Math.ceil(selection.verses.length / Math.max(1, versesPerSlide));

  return (
    <Modal
      open
      onClose={onClose}
      title={`Save ${formatReference(selection.range, selection.version)}`}
      width={480}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={() => onSave(versesPerSlide, showVerseNumbers, showReference)}>
            <BookmarkPlus size={15} />
            Save passage
          </Btn>
        </>
      }
    >
      <p style={{ fontFamily: UI, fontSize: 13, color: C.sub, marginTop: 0, lineHeight: 1.6 }}>
        The passage is turned into presentation slides. You can restyle it, change backgrounds and
        re-chunk verses any time in the passage editor.
      </p>
      <Field label={`Verses per slide (${versesPerSlide}) — makes ${slideCount} slide${slideCount === 1 ? "" : "s"}`}>
        <Range value={versesPerSlide} min={1} max={6} onChange={(e) => setVersesPerSlide(Number(e.target.value))} />
      </Field>
      <div style={{ marginBottom: 10 }}>
        <Toggle label="Show verse numbers" checked={showVerseNumbers} onChange={setShowVerseNumbers} />
      </div>
      <Toggle label="Show reference on each slide" checked={showReference} onChange={setShowReference} />
    </Modal>
  );
}
