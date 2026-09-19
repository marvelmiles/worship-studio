import { useEffect, useState } from "react";
import { Info, RefreshCw } from "lucide-react";
import type { Manuscript, ManuscriptFormat, Theme } from "../../types";
import { useUITheme } from "../../theme/ThemeProvider";
import { useTextFormatting } from "../../hooks/useTextFormatting";
import { resolveStyle } from "../../lib/resolve";
import { slideRowCapacity, slideTextMetrics } from "../../lib/slideLayout";
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
  theme: Theme;
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
  theme,
  onRegenerate,
}: ManuscriptTextModalProps) => {
  const { colors, fonts } = useUITheme();
  /* What the manuscript's own text size can hold with room to spare above and
     below, which is where the slider starts and what it falls back to. */
  const fittedLines = slideRowCapacity(
    slideTextMetrics(resolveStyle(undefined, manuscript, theme)),
  );

  const [body, setBody] = useState(manuscript.body);
  const [format, setFormat] = useState<ManuscriptFormat>(
    manuscript.format ?? DEFAULT_MANUSCRIPT_FORMAT,
  );
  const [guideOpen, setGuideOpen] = useState(false);
  const [maxLines, setMaxLines] = useState(manuscript.maxLines || fittedLines);
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
    setMaxLines(clampLines(storedMaxLines || fittedLines, opened));
  }, [open, storedBody, storedMaxLines, storedFormat, fittedLines]);

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
        <p
          style={{
            fontFamily: fonts.ui,
            fontSize: 11.5,
            lineHeight: 1.55,
            color: colors.dim,
            margin: "-6px 0 0",
          }}
        >
          At this manuscript's text size a slide shows about {fittedLines} line
          {fittedLines === 1 ? "" : "s"} and still keeps its space top and
          bottom. Anything longer moves onto the next slide.
        </p>
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
