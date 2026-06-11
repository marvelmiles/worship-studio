import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import type { Song } from "../../types";
import { C, UI } from "../../theme/tokens";
import { Btn } from "../../components/ui/Button";
import { Field, inputStyle, Range } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Modal";

interface LyricsModalProps {
  open: boolean;
  onClose: () => void;
  song: Song;
  onRegenerate: (lyrics: string, maxLines: number) => void;
}

export function LyricsModal({ open, onClose, song, onRegenerate }: LyricsModalProps) {
  const [lyrics, setLyrics] = useState(song.lyrics);
  const [maxLines, setMaxLines] = useState(song.maxLines || 6);

  useEffect(() => {
    if (open) {
      setLyrics(song.lyrics);
      setMaxLines(song.maxLines || 6);
    }
  }, [open, song.lyrics, song.maxLines]);

  const regenerate = () => {
    onRegenerate(lyrics, maxLines);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Lyrics"
      width={640}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={regenerate}>
            <Sparkles size={15} />
            Regenerate slides
          </Btn>
        </>
      }
    >
      <p style={{ fontFamily: UI, fontSize: 13, color: C.sub, marginTop: 0, lineHeight: 1.6 }}>
        Tags:{" "}
        <code style={{ color: C.goldSoft }}>
          [verse] [chorus] [bridge] [intro] [outro] [tag] [refrain] [pre-chorus]
        </code>
        . Repeated sections auto-number (Verse 1, Verse 2). No tags → blank lines become numbered
        verses. Long sections split automatically.
      </p>
      <textarea
        value={lyrics}
        onChange={(e) => setLyrics(e.target.value)}
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
        <Field label={`Max lines per slide (${maxLines})`}>
          <Range value={maxLines} min={2} max={10} onChange={(e) => setMaxLines(Number(e.target.value))} />
        </Field>
      </div>
      <p style={{ fontFamily: UI, fontSize: 12, color: C.danger, opacity: 0.85, margin: 0 }}>
        Regenerating rebuilds slides from lyrics and resets per-slide overrides.
      </p>
    </Modal>
  );
}
