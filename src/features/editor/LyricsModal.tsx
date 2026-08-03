import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { Song } from "../../types";
import { colors, UI } from "../../theme/tokens";
import { Button } from "../../components/ui/Button";
import { Field, inputStyle, Range } from "../../components/ui/Field";
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

interface LyricsModalProps {
  open: boolean;
  onClose: () => void;
  song: Song;
  onRegenerate: (lyrics: string, maxLines: number) => void;
}

export function LyricsModal({
  open,
  onClose,
  song,
  onRegenerate,
}: LyricsModalProps) {
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
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={regenerate}>
            <RefreshCw size={15} />
            Regenerate slides
          </Button>
        </>
      }
    >
      <p style={helpStyle}>
        Paste the lyrics as they come. Sections are picked up however they are
        written, <Mark>[Chorus]</Mark>, <Mark>## Chorus</Mark>,{" "}
        <Mark>**Chorus**</Mark>, <Mark>Chorus:</Mark>,{" "}
        <Mark>Chorus: first line</Mark> or a bare <Mark>Bridge</Mark>, and so
        are performer cues like <Mark>Soloist:</Mark> and <Mark>Choir:</Mark>.
        Untagged stanzas become verses, keeping any <Mark>1.</Mark>{" "}
        <Mark>(2)</Mark> <Mark>IV.</Mark> numbering. A heading such as{" "}
        <Mark>Title — Artist</Mark> on the first line fills in the song details.
      </p>
      <p style={helpStyle}>
        Repeat marks never reach the screen: <Mark>(2x)</Mark> <Mark>/2ce</Mark>{" "}
        <Mark>[4x]</Mark> move into the presenter notes, and a cue pointing
        elsewhere, <Mark>Repeat Chorus (3x)</Mark>, a trailing{" "}
        <Mark>[Refrain]</Mark>, or an empty <Mark>Chorus:</Mark>, adds a
        &ldquo;repeat slide 4&rdquo; note instead of building the slide twice.
        Emphasis carries through: <Mark>**bold**</Mark> <Mark>*italic*</Mark>{" "}
        <Mark>~~strikethrough~~</Mark>.
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
        Regenerating rebuilds slides from lyrics and resets per-slide overrides.
      </p>
    </Modal>
  );
}
