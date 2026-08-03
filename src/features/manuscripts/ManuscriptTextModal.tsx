import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { Manuscript } from "../../types";
import { colors, UI } from "../../theme/tokens";
import { useTextFormatting } from "../../hooks/useTextFormatting";
import { Button } from "../../components/ui/Button";
import { Field, inputStyle, Range } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Modal";
import { FormatToolbar } from "../../components/controls/FormatToolbar";

const helpStyle: React.CSSProperties = {
  fontFamily: UI,
  fontSize: 12.5,
  color: colors.sub,
  margin: "0 0 10px",
  lineHeight: 1.65,
};

const Mark = ({ children }: { children: React.ReactNode }) => (
  <code style={{ color: colors.accentSoft }}>{children}</code>
);

interface ManuscriptTextModalProps {
  open: boolean;
  onClose: () => void;
  manuscript: Manuscript;
  onRegenerate: (body: string, maxLines: number) => void;
}

export function ManuscriptTextModal({
  open,
  onClose,
  manuscript,
  onRegenerate,
}: ManuscriptTextModalProps) {
  const [body, setBody] = useState(manuscript.body);
  const [maxLines, setMaxLines] = useState(manuscript.maxLines || 6);
  const formatting = useTextFormatting({ value: body, onChange: setBody });

  useEffect(() => {
    if (open) {
      setBody(manuscript.body);
      setMaxLines(manuscript.maxLines || 6);
    }
  }, [open, manuscript.body, manuscript.maxLines]);

  const regenerate = () => {
    onRegenerate(body, maxLines);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Manuscript Text"
      width={640}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={regenerate}>
            <RefreshCw size={15} />
            Regenerate slides
          </Button>
        </>
      }
    >
      <p style={helpStyle}>
        Paste the text as it comes, lyrics, a hymn or a sermon outline. Open
        with <Mark>HYMN: Ancient Words</Mark>, <Mark>SONG: …</Mark> or{" "}
        <Mark>SERMON: …</Mark> and that line names the manuscript and files it
        in the matching collection instead of becoming a slide. Sections are
        picked up however they are written, <Mark>[Chorus]</Mark>,{" "}
        <Mark>## Chorus</Mark>, <Mark>**Chorus**</Mark>, <Mark>Chorus:</Mark>,{" "}
        <Mark>Chorus: first line</Mark> or a bare <Mark>Bridge</Mark>, and so
        are performer cues like <Mark>Soloist:</Mark> and <Mark>Choir:</Mark>.
        Untagged stanzas become verses, keeping any <Mark>1.</Mark>{" "}
        <Mark>(2)</Mark> <Mark>IV.</Mark> numbering.
      </p>
      <p style={helpStyle}>
        Repeat marks never reach the screen: <Mark>(2x)</Mark> <Mark>/2ce</Mark>{" "}
        <Mark>[4x]</Mark> move into the presenter notes, and a cue pointing
        elsewhere, <Mark>Repeat Chorus (3x)</Mark>, a trailing{" "}
        <Mark>[Refrain]</Mark>, or an empty <Mark>Chorus:</Mark>, adds a
        &ldquo;repeat slide 4&rdquo; note instead of building the slide twice.
      </p>
      <div style={{ marginBottom: 8 }}>
        <FormatToolbar controller={formatting} block />
      </div>
      <textarea
        ref={formatting.bind}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onSelect={formatting.syncSelection}
        onKeyUp={formatting.syncSelection}
        onClick={formatting.syncSelection}
        onKeyDown={formatting.handleKeyDown}
        style={{
          ...inputStyle,
          minHeight: 320,
          fontFamily: "ui-monospace, monospace",
          lineHeight: 1.65,
          resize: "vertical",
          fontSize: 13.5,
        }}
      />
      <p style={{ ...helpStyle, margin: "8px 0 0" }}>
        Highlight any word or sentence and use the toolbar to format it. The
        marks are plain text, <Mark>**bold**</Mark> <Mark>*italic*</Mark>{" "}
        <Mark>++underline++</Mark> <Mark>~~strikethrough~~</Mark>{" "}
        <Mark>==highlight==</Mark>, so they survive copy and paste.
      </p>
      <div style={{ marginTop: 12 }}>
        <Field label={`Max lines per slide (${maxLines})`}>
          <Range
            value={maxLines}
            min={2}
            max={10}
            onChange={(e) => setMaxLines(Number(e.target.value))}
          />
        </Field>
      </div>
      <p
        style={{
          fontFamily: UI,
          fontSize: 12,
          color: colors.danger,
          opacity: 0.85,
          margin: 0,
        }}
      >
        Regenerating rebuilds slides from this text and resets per-slide
        overrides.
      </p>
    </Modal>
  );
}
