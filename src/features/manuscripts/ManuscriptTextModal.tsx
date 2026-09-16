import { useEffect, useState } from "react";
import { Info, RefreshCw } from "lucide-react";
import type { Manuscript, ManuscriptFormat } from "../../types";
import { useTextFormatting } from "../../hooks/useTextFormatting";
import {
  DEFAULT_MANUSCRIPT_FORMAT,
  MANUSCRIPT_FORMAT_OPTIONS,
} from "../../lib/manuscript/format";
import { Button, IconButton } from "../../components/ui/Button";
import { Field, inputStyle, Range, Select } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Modal";
import { ManuscriptFormatGuideModal } from "./ManuscriptFormatGuideModal";

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

export const ManuscriptTextModal = ({
  open,
  onClose,
  manuscript,
  onRegenerate,
}: ManuscriptTextModalProps) => {
  const [body, setBody] = useState(manuscript.body);
  const [format, setFormat] = useState<ManuscriptFormat>(
    manuscript.format ?? DEFAULT_MANUSCRIPT_FORMAT,
  );
  const [guideOpen, setGuideOpen] = useState(false);
  const [maxLines, setMaxLines] = useState(manuscript.maxLines || 6);
  const formatting = useTextFormatting({ value: body, onChange: setBody });
  const isSermon = format === "sermon";

  const {
    body: storedBody,
    maxLines: storedMaxLines,
    format: storedFormat,
  } = manuscript;
  useEffect(() => {
    if (!open) return;
    const opened = storedFormat ?? DEFAULT_MANUSCRIPT_FORMAT;
    setBody(storedBody);
    setFormat(opened);
    setMaxLines(clampLines(storedMaxLines || 6, opened));
  }, [open, storedBody, storedMaxLines, storedFormat]);

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
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Field label="Format type">
            <Select
              value={format}
              options={MANUSCRIPT_FORMAT_OPTIONS}
              onChange={(e) => changeFormat(e.target.value as ManuscriptFormat)}
            />
          </Field>
        </div>
        <div style={{ marginBottom: 16 }}>
          <IconButton
            icon={Info}
            title="How the text is read"
            filled
            onClick={() => setGuideOpen(true)}
          />
        </div>
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
      {guideOpen && (
        <ManuscriptFormatGuideModal
          open
          onClose={() => setGuideOpen(false)}
          format={format}
        />
      )}
    </Modal>
  );
};
