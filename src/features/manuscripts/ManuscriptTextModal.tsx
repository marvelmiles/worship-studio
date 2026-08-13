import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { Manuscript, ManuscriptFormat } from "../../types";
import { colors, UI } from "../../theme/tokens";
import { useTextFormatting } from "../../hooks/useTextFormatting";
import {
  MANUSCRIPT_FORMAT_OPTIONS,
  resolveManuscriptFormat,
} from "../../lib/manuscript/format";
import { Button } from "../../components/ui/Button";
import { Field, inputStyle, Range, Select } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Modal";

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

/** Sermon paragraphs need more room than a stanza of lyrics does. */
const LINE_RANGE: Record<ManuscriptFormat, { min: number; max: number }> = {
  song: { min: 2, max: 10 },
  sermon: { min: 4, max: 16 },
};

const clampLines = (value: number, format: ManuscriptFormat): number => {
  const { min, max } = LINE_RANGE[format];
  return Math.min(max, Math.max(min, value));
};

interface ManuscriptTextModalProps {
  open: boolean;
  onClose: () => void;
  manuscript: Manuscript;
  onRegenerate: (
    body: string,
    maxLines: number,
    format: ManuscriptFormat,
  ) => void;
}

export function ManuscriptTextModal({
  open,
  onClose,
  manuscript,
  onRegenerate,
}: ManuscriptTextModalProps) {
  const [body, setBody] = useState(manuscript.body);
  const [format, setFormat] = useState<ManuscriptFormat>(
    resolveManuscriptFormat(manuscript),
  );
  const [maxLines, setMaxLines] = useState(manuscript.maxLines || 6);
  const formatting = useTextFormatting({ value: body, onChange: setBody });
  const isSermon = format === "sermon";

  // Watching the fields rather than the record: the workspace hands over a new
  // draft object on every keystroke elsewhere, which would reset the textarea.
  const {
    body: storedBody,
    maxLines: storedMaxLines,
    format: storedFormat,
    collection,
  } = manuscript;
  useEffect(() => {
    if (!open) return;
    const opened = resolveManuscriptFormat({
      format: storedFormat,
      collection,
    });
    setBody(storedBody);
    setFormat(opened);
    setMaxLines(clampLines(storedMaxLines || 6, opened));
  }, [open, storedBody, storedMaxLines, storedFormat, collection]);

  const changeFormat = (next: ManuscriptFormat) => {
    setFormat(next);
    setMaxLines((lines) => clampLines(lines, next));
  };

  const regenerate = () => {
    onRegenerate(body, maxLines, format);
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
      <div style={{ marginBottom: 4 }}>
        <Field label="Format type">
          <Select
            value={format}
            options={MANUSCRIPT_FORMAT_OPTIONS}
            onChange={(e) => changeFormat(e.target.value as ManuscriptFormat)}
          />
        </Field>
      </div>
      <p style={helpStyle}>
        Paste the text as it comes. Open with <Mark>HYMN: Ancient Words</Mark>,{" "}
        <Mark>SONG: …</Mark> or <Mark>SERMON: …</Mark> and that line names the
        manuscript and files it in the matching collection instead of becoming a
        slide.
      </p>
      {isSermon ? (
        <>
          <p style={helpStyle}>
            The sermon format reads the text as prose. The topic, the passage it
            is preached from and the preacher open the deck on a title slide,
            written as <Mark>Text: John 3:16</Mark>,{" "}
            <Mark>Preacher: Pastor Ada</Mark> or <Mark>By Pastor Ada</Mark>{" "}
            under the heading. Points keep their own heading, whether written{" "}
            <Mark>## The Cross</Mark>, <Mark>**The Cross**</Mark>,{" "}
            <Mark>THE CROSS</Mark>, <Mark>Introduction:</Mark> or{" "}
            <Mark>1. The Cross</Mark>.
          </p>
          <p style={helpStyle}>
            Paragraphs stay whole. A blank line starts a new one, wrapped lines
            are rejoined, and a paragraph too long for one slide is carried on
            at a sentence break rather than cut mid-thought.
          </p>
        </>
      ) : (
        <>
          <p style={helpStyle}>
            Sections are picked up however they are written,{" "}
            <Mark>[Chorus]</Mark>, <Mark>## Chorus</Mark>,{" "}
            <Mark>**Chorus**</Mark>, <Mark>Chorus:</Mark>,{" "}
            <Mark>Chorus: first line</Mark> or a bare <Mark>Bridge</Mark>, and
            so are performer cues like <Mark>Soloist:</Mark> and{" "}
            <Mark>Choir:</Mark>. Untagged stanzas become verses, keeping any{" "}
            <Mark>1.</Mark> <Mark>(2)</Mark> <Mark>IV.</Mark> numbering.
          </p>
          <p style={helpStyle}>
            Repeat marks never reach the screen: <Mark>(2x)</Mark>{" "}
            <Mark>/2ce</Mark> <Mark>[4x]</Mark> move into the presenter notes,
            and a cue pointing elsewhere, <Mark>Repeat Chorus (3x)</Mark>, a
            trailing <Mark>[Refrain]</Mark>, or an empty <Mark>Chorus:</Mark>,
            adds a &ldquo;repeat slide 4&rdquo; note instead of building the
            slide twice.
          </p>
        </>
      )}
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
        Emphasis is plain text here, <Mark>**bold**</Mark> <Mark>*italic*</Mark>{" "}
        <Mark>++underline++</Mark> <Mark>~~strikethrough~~</Mark>{" "}
        <Mark>==highlight==</Mark>, and so are lists, <Mark>- point</Mark>{" "}
        <Mark>1. point</Mark> <Mark>a. point</Mark> <Mark>i. point</Mark>. Tab
        and Shift+Tab move a point in and out to build sub-points. Once the
        slides are built, format them by highlighting the words on the slide
        itself.
      </p>
      <div style={{ marginTop: 12 }}>
        <Field
          label={
            isSermon
              ? `Lines of text per slide, roughly (${maxLines})`
              : `Max lines per slide (${maxLines})`
          }
        >
          <Range
            value={maxLines}
            min={LINE_RANGE[format].min}
            max={LINE_RANGE[format].max}
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
