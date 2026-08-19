import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { BibleVersionId, ScripturePassage } from "../../types";
import {
  BIBLE_BOOKS,
  BIBLE_VERSIONS,
  DEFAULT_BIBLE_VERSION,
  bookById,
  isBibleVersion,
} from "../../data/bibleBooks";
import { colors, UI } from "../../theme/tokens";
import { useStore } from "../../store/useStore";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import {
  Field,
  Range,
  Select,
  Toggle,
  SectionTitle,
} from "../../components/ui/Field";
import { StyleControls } from "../../components/controls/StyleControls";
import { BackgroundPicker } from "../../components/controls/BackgroundPicker";
import { AudioPicker } from "../../components/controls/AudioPicker";
import { AnimationPicker } from "../../components/controls/AnimationPicker";
import { resolveBackgroundImage, resolveStyle } from "../../lib/resolve";
import { getChapterVerses } from "./lib/offlineBible";
import type { DeckEditor } from "../editor/useDeckEditor";

interface PassageSettingsModalProps {
  open: boolean;
  onClose: () => void;
  passage: ScripturePassage;
  editor: DeckEditor;
}

const GRID = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
  gap: 12,
} as const;

export function PassageSettingsModal({
  open,
  onClose,
  passage,
  editor,
}: PassageSettingsModalProps) {
  const themes = useStore((s) => s.themes);
  const backgrounds = useStore((s) => s.backgrounds);
  const audio = useStore((s) => s.audio);
  const addCustomBackground = useStore((s) => s.addCustomBackground);
  const rebuildScriptureSlides = useStore((s) => s.rebuildScriptureSlides);
  const pushToast = useStore((s) => s.pushToast);

  // Passages saved by older releases may carry a translation that is no
  // longer available (copyrighted versions were removed when scripture went
  // fully offline), rebuilding those falls back to the default.
  const safeVersion = (value: BibleVersionId) =>
    isBibleVersion(value) ? value : DEFAULT_BIBLE_VERSION;
  const [version, setVersion] = useState<BibleVersionId>(
    safeVersion(passage.version),
  );
  const [bookId, setBookId] = useState(passage.range.bookId);
  const [chapter, setChapter] = useState(passage.range.chapter);
  const [verseStart, setVerseStart] = useState(passage.range.verseStart);
  const [verseEnd, setVerseEnd] = useState(passage.range.verseEnd);
  const [versesPerSlide, setVersesPerSlide] = useState(passage.versesPerSlide);
  const [showVerseNumbers, setShowVerseNumbers] = useState(
    passage.showVerseNumbers,
  );
  const [showReference, setShowReference] = useState(passage.showReference);
  const [rebuilding, setRebuilding] = useState(false);

  useEffect(() => {
    if (!open) return;
    setVersion(safeVersion(passage.version));
    setBookId(passage.range.bookId);
    setChapter(passage.range.chapter);
    setVerseStart(passage.range.verseStart);
    setVerseEnd(passage.range.verseEnd);
    setVersesPerSlide(passage.versesPerSlide);
    setShowVerseNumbers(passage.showVerseNumbers);
    setShowReference(passage.showReference);
  }, [open, passage]);

  const book = bookById(bookId);
  const theme = useMemo(
    () => themes.find((t) => t.id === passage.defaultThemeId) || themes[0],
    [themes, passage.defaultThemeId],
  );
  const themeAudio = theme.defaultAudioId
    ? audio.find((a) => a.id === theme.defaultAudioId)
    : undefined;
  const effectiveBackground = backgrounds.find(
    (bg) => bg.id === (passage.defaultBackgroundId || theme.backgroundId),
  );
  const backgroundImage = effectiveBackground
    ? resolveBackgroundImage(undefined, passage, effectiveBackground)
    : null;

  // A range that runs backwards is refused rather than quietly turned around:
  // an operator who picked the wrong end should be told, not given verses they
  // did not ask for halfway through a service.
  const rangeError =
    verseStart > verseEnd
      ? "The first verse has to come before the last one."
      : null;

  const rebuild = async () => {
    if (!book) return;
    if (rangeError) {
      pushToast(rangeError, "error");
      return;
    }
    setRebuilding(true);
    try {
      const chapterVerses = await getChapterVerses(version, bookId, chapter);
      const verses = chapterVerses.filter(
        (v) => v.v >= verseStart && v.v <= verseEnd,
      );
      if (!verses.length) {
        pushToast("That verse range is empty in this chapter.", "error");
        return;
      }
      rebuildScriptureSlides(passage.id, {
        version,
        range: {
          bookId,
          bookName: book.name,
          chapter,
          verseStart: verses[0].v,
          verseEnd: verses[verses.length - 1].v,
        },
        verses,
        versesPerSlide,
        showVerseNumbers,
        showReference,
      });
      editor.setSelectedId(null);
      pushToast("Slides rebuilt from the passage.");
      onClose();
    } catch (err) {
      pushToast((err as Error).message, "error");
    } finally {
      setRebuilding(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Passage Settings" width={620}>
      <p
        style={{
          fontFamily: UI,
          fontSize: 13,
          color: colors.sub,
          marginTop: 0,
          lineHeight: 1.6,
        }}
      >
        These settings apply to every slide in this passage. Individual slides
        can still override them in the inspector.
      </p>

      <SectionTitle>Passage</SectionTitle>
      <div style={GRID}>
        <Field label="Version">
          <Select
            value={version}
            options={BIBLE_VERSIONS.map((v) => ({ value: v.id, label: v.id }))}
            onChange={(e) => setVersion(e.target.value as BibleVersionId)}
          />
        </Field>
        <Field label="Book">
          <Select
            value={String(bookId)}
            options={BIBLE_BOOKS.map((b) => ({
              value: String(b.id),
              label: b.name,
            }))}
            onChange={(e) => {
              setBookId(Number(e.target.value));
              setChapter(1);
            }}
          />
        </Field>
        <Field label="Chapter">
          <Select
            value={String(chapter)}
            options={Array.from({ length: book?.chapters || 1 }, (_, i) =>
              String(i + 1),
            )}
            onChange={(e) => setChapter(Number(e.target.value))}
          />
        </Field>
        <Field label="Verses (from – to)" error={rangeError}>
          <div style={{ display: "flex", gap: 8 }}>
            <Select
              value={String(verseStart)}
              options={Array.from({ length: 176 }, (_, i) => String(i + 1))}
              onChange={(e) => setVerseStart(Number(e.target.value))}
            />
            <Select
              value={String(verseEnd)}
              options={Array.from({ length: 176 }, (_, i) => String(i + 1))}
              onChange={(e) => setVerseEnd(Number(e.target.value))}
            />
          </div>
        </Field>
      </div>

      <SectionTitle>Slide Format</SectionTitle>
      <Field label={`Verses per slide (${versesPerSlide})`}>
        <Range
          value={versesPerSlide}
          min={1}
          max={6}
          onChange={(e) => setVersesPerSlide(Number(e.target.value))}
        />
      </Field>
      <div style={{ marginBottom: 8 }}>
        <Toggle
          label="Show verse numbers"
          checked={showVerseNumbers}
          onChange={setShowVerseNumbers}
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <Toggle
          label="Show reference on each slide"
          checked={showReference}
          onChange={setShowReference}
        />
      </div>
      <Button
        variant="primary"
        onClick={() => void rebuild()}
        busy={rebuilding}
        disabled={Boolean(rangeError)}
        title={rangeError ?? "Rebuild this passage from its verses"}
      >
        <RefreshCw size={15} />
        Apply & rebuild slides
      </Button>
      <p
        style={{
          fontFamily: UI,
          fontSize: 12,
          color: colors.danger,
          opacity: 0.85,
          margin: "10px 0 0",
        }}
      >
        Rebuilding refetches the verses and resets per-slide overrides.
      </p>

      <SectionTitle>Theme</SectionTitle>
      <Field label="Theme">
        <Select
          value={passage.defaultThemeId}
          options={themes.map((t) => ({ value: t.id, label: t.name }))}
          onChange={(e) => editor.patchDoc({ defaultThemeId: e.target.value })}
        />
      </Field>

      <SectionTitle>Text</SectionTitle>
      <StyleControls
        style={resolveStyle(undefined, passage, theme)}
        onChange={(key, value) => editor.updateDocStyle(key, value)}
      />

      <SectionTitle>Background</SectionTitle>
      <BackgroundPicker
        backgrounds={backgrounds}
        value={passage.defaultBackgroundId || ""}
        highlightId={passage.defaultBackgroundId || theme.backgroundId}
        inheritLabel={`Use theme (${theme.name})`}
        onSelect={(id, image) =>
          editor.patchDoc({
            defaultBackgroundId: id,
            defaultBackgroundImage: image,
          })
        }
        onUploaded={(id, image) =>
          editor.patchDoc({
            defaultBackgroundId: id,
            defaultBackgroundImage: image,
          })
        }
        onAddColor={(value, name) =>
          editor.patchDoc({
            defaultBackgroundId: addCustomBackground(value, name),
          })
        }
        imageSettings={backgroundImage}
        onImageSettingsChange={(settings) =>
          editor.patchDoc({ defaultBackgroundImage: settings })
        }
        usageLabel="this passage"
      />

      <SectionTitle>Audio</SectionTitle>
      <AudioPicker
        audio={audio}
        value={passage.defaultAudioId || ""}
        inheritLabel={
          themeAudio ? `Use theme audio (${themeAudio.name})` : "None"
        }
        onSelect={(id) => editor.patchDoc({ defaultAudioId: id || null })}
        onUploaded={(id) => editor.patchDoc({ defaultAudioId: id })}
      />

      <SectionTitle>Animation</SectionTitle>
      <AnimationPicker
        value={passage.animation || ""}
        inheritLabel="Use theme / app default"
        onSelect={(value) =>
          editor.patchDoc({
            animation: (value || undefined) as ScripturePassage["animation"],
          })
        }
      />
    </Modal>
  );
}
