import { useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, BookOpen, Music } from "lucide-react";
import type { ManuscriptFormat } from "../../types";
import { feedbackTone } from "../../theme/uiTheme";
import { useUITheme } from "../../theme/ThemeProvider";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { PillTabs } from "../../components/ui/PillTabs";
import type { PillTab } from "../../components/ui/PillTabs";

const FORMAT_TABS: PillTab<ManuscriptFormat>[] = [
  { id: "song", label: "Song", icon: Music },
  { id: "sermon", label: "Sermon", icon: BookOpen },
];

interface ManuscriptFormatGuideModalProps {
  open: boolean;
  onClose: () => void;
  format: ManuscriptFormat;
}

export const ManuscriptFormatGuideModal = ({
  open,
  onClose,
  format,
}: ManuscriptFormatGuideModalProps) => {
  const [tab, setTab] = useState<ManuscriptFormat>(format);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Formatting guide"
      width={600}
      footer={
        <Button variant="primary" onClick={onClose}>
          Got it
        </Button>
      }
    >
      <GuideSection title="Titles and collections">
        Paste the text as it comes. Open with <Mark>HYMN: Ancient Words</Mark>,{" "}
        <Mark>SONG: Way Maker</Mark> or <Mark>SERMON: Grace</Mark> and that line
        names the manuscript and files it in the matching collection instead of
        becoming a slide.
      </GuideSection>

      <div style={{ margin: "4px 0 14px" }}>
        <PillTabs<ManuscriptFormat>
          tabs={FORMAT_TABS}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === "song" ? (
        <>
          <GuideSection title="Sections">
            Sections are picked up however they are written:{" "}
            <Mark>[Chorus]</Mark>, <Mark>## Chorus</Mark>,{" "}
            <Mark>**Chorus**</Mark>, <Mark>Chorus:</Mark>,{" "}
            <Mark>Chorus: first line</Mark> or a bare <Mark>Bridge</Mark>.
            Performer cues like <Mark>Soloist:</Mark> and <Mark>Choir:</Mark>{" "}
            are kept too.
          </GuideSection>
          <GuideSection title="Verses and numbering">
            Untagged stanzas become verses. A stanza opening <Mark>1.</Mark>{" "}
            <Mark>(2)</Mark> or <Mark>IV.</Mark> is numbered by it: the number
            labels the slide instead of standing in front of the lyric.
          </GuideSection>
          <GuideSection title="Hymnbook text">
            Hymnal exports drop straight in. <Mark>Verse 1:</Mark> and{" "}
            <Mark>Refrain:</Mark> headings become slides, an{" "}
            <Mark>Author:</Mark> line anywhere in the text fills the author
            instead of becoming a lyric, tune cues such as <Mark>@e1</Mark> and{" "}
            <Mark>Road Map:</Mark> lines are dropped, and singing hyphens in{" "}
            <Mark>a-bide with me</Mark> are closed up so the words read and
            search whole.
          </GuideSection>
          <GuideSection title="Repeats">
            Repeat marks never reach the screen. <Mark>(2x)</Mark>{" "}
            <Mark>/2ce</Mark> and <Mark>[4x]</Mark> move into the presenter
            notes, and a cue pointing elsewhere, such as{" "}
            <Mark>Repeat Chorus (3x)</Mark>, a trailing <Mark>[Refrain]</Mark>{" "}
            or an empty <Mark>Chorus:</Mark>, adds a repeat note instead of
            building the slide twice.
          </GuideSection>
        </>
      ) : (
        <>
          <GuideSection title="Title slide">
            The topic, the passage and the preacher open the deck on a title
            slide. Write them as <Mark>Text: John 3:16</Mark>,{" "}
            <Mark>Preacher: Pastor Ada</Mark> or <Mark>By Pastor Ada</Mark>{" "}
            under the heading.
          </GuideSection>
          <GuideSection title="Points">
            Points keep their own heading, whether written{" "}
            <Mark>## The Cross</Mark>, <Mark>**The Cross**</Mark>,{" "}
            <Mark>THE CROSS</Mark>, <Mark>Introduction:</Mark> or{" "}
            <Mark>1. The Cross</Mark>.
          </GuideSection>
          <GuideSection title="Paragraphs">
            Paragraphs stay whole. A blank line starts a new one, wrapped lines
            are rejoined, and a paragraph too long for one slide carries on at a
            sentence break rather than being cut mid-thought.
          </GuideSection>
        </>
      )}

      <GuideSection title="Emphasis and lists">
        Emphasis is written as plain text: <Mark>**bold**</Mark>{" "}
        <Mark>*italic*</Mark> <Mark>++underline++</Mark>{" "}
        <Mark>~~strikethrough~~</Mark> <Mark>==highlight==</Mark>. So are lists:{" "}
        <Mark>- point</Mark> <Mark>1. point</Mark> <Mark>a. point</Mark>{" "}
        <Mark>i. point</Mark>. Tab and Shift+Tab move a point in and out to
        build sub-points. Once the slides are built, format them by highlighting
        the words on the slide itself.
      </GuideSection>

      <RegenerateWarning />
    </Modal>
  );
};

const GuideSection = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => {
  const { colors, fonts } = useUITheme();
  return (
    <section style={{ marginBottom: 14 }}>
      <h4
        style={{
          margin: "0 0 5px",
          fontFamily: fonts.ui,
          fontSize: 13,
          fontWeight: 600,
          color: colors.text,
        }}
      >
        {title}
      </h4>
      <p
        style={{
          margin: 0,
          fontFamily: fonts.ui,
          fontSize: 12.5,
          lineHeight: 1.65,
          color: colors.sub,
        }}
      >
        {children}
      </p>
    </section>
  );
};

const Mark = ({ children }: { children: ReactNode }) => {
  const { colors } = useUITheme();
  return <code style={{ color: colors.accentSoft }}>{children}</code>;
};

const RegenerateWarning = () => {
  const { colors, fonts } = useUITheme();
  const tone = feedbackTone(colors.danger, colors.text);
  return (
    <div
      role="note"
      style={{
        display: "flex",
        gap: 9,
        alignItems: "flex-start",
        padding: "10px 12px",
        borderRadius: 11,
        background: tone.bg,
        border: `1px solid ${tone.border}`,
        color: tone.text,
        fontFamily: fonts.ui,
        fontSize: 12.5,
        lineHeight: 1.55,
      }}
    >
      <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
      Regenerating rebuilds every slide from the text and resets per-slide
      styling and overrides.
    </div>
  );
};
