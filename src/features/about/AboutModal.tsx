import { useState } from "react";
import { ChevronDown, Mail, Sparkles } from "lucide-react";
import { useStore } from "../../store/useStore";
import { C, DISPLAY, UI } from "../../theme/tokens";
import { Modal } from "../../components/ui/Modal";
import { SectionTitle } from "../../components/ui/Field";

const CONTACT_EMAIL = "marvellousabidemi2@gmail.com";

const FAQS: { q: string; a: string }[] = [
  {
    q: "How do I present to a projector or TV over HDMI?",
    a: "Connect your computer to the screen with HDMI and set the display to extend (not mirror) your desktop. Open a song, Bible passage, image or video, click Present, then click the Go Live button (the monitor icon) in the on-screen controls. The first time, your browser asks permission to manage windows — allow it. WorshipStudio then projects fullscreen on the external display while you keep the controls and presenter notes on your own screen. If your browser doesn't support multi-screen placement, Go Live simply goes fullscreen on the current screen, which you can drag onto the projector. When projection is active the Go Live button stays highlighted.",
  },
  {
    q: "How do I present a Bible verse?",
    a: "Open the Bible tab and pick a book, then a chapter, then a verse — the reader opens scrolled to it (the breadcrumb at the top takes you back to books, chapters or verses at any point). You can switch between the King James Version and the American Standard Version from the dropdown, or type a reference like John 3:16-18 in the reader's jump box. Click a verse to select it, Ctrl-click (or Shift+↑/↓) to extend the selection, then hit Present to project it immediately (double-clicking a verse does the same for just that verse) — or hit Edit to fine-tune the slides first. Save Passage keeps the selection as styled slides you can restyle, re-chunk and present later from the Saved tab.",
  },
  {
    q: "Does the Bible work offline?",
    a: "Yes — completely. The full text of both translations (KJV and ASV) ships inside the app itself, so reading, verse search and saved passages all work with no internet connection at all. Nothing is ever fetched from an online Bible service. See the Scripture Data & Licensing section below for where the text comes from.",
  },
  {
    q: "Can I edit images and videos?",
    a: "Yes — both editors are non-destructive, so your original file is never altered. Images: brightness, contrast, saturation, grayscale, sepia, blur, rotate, flip, screen fit and a legibility overlay. Videos: trim start/end, volume, mute, loop, playback speed, screen fit and the same color adjustments. While a video is live you get play/pause, seeking, restart and volume controls on your console — and any image can be added to your background library with one click.",
  },
  {
    q: "Are my edits saved automatically?",
    a: "Yes — every change saves itself the moment you make it. Editing lyrics, restyling a slide, reordering, inserting, splitting or deleting slides, and adjusting song or theme settings are all written to your device automatically; there's no Save button to remember. For an external backup or to move your work to another device, use Export Data in Settings.",
  },
  {
    q: "How do I turn lyrics into slides?",
    a: "Paste your lyrics into a song and WorshipStudio builds the slides automatically. You can tag sections with [verse] (or [solo], which is treated the same as a verse), [chorus], [bridge], [intro], [outro], [tag], [refrain] or [pre-chorus] for clean labels and auto-numbering, or just separate sections with blank lines. You can also give a tag its own number, like [Verse 3] — it'll keep that number and the verses will be sorted into order automatically even if you typed them out of sequence. Long sections are split for you, and you can set the maximum lines per slide.",
  },
  {
    q: "Can I split, merge, duplicate, or reorder slides?",
    a: "Yes — building a set is meant to be quick. In the slide inspector you'll find buttons to duplicate a slide, split it into two, merge it into the next one, or delete it. You can drag slides to reorder them, right-click (or long-press) a slide for the same actions in a menu, and insert a new blank slide anywhere. Edits save automatically as you go.",
  },
  {
    q: "What's the difference between default and custom assets?",
    a: "Default themes, backgrounds, and sounds ship with the app so you always have something to work with — they can't be deleted (default themes can still be edited). Anything you add yourself — uploaded images, custom colors, audio files, or new themes — is custom and can be edited or deleted freely.",
  },
  {
    q: "What is a theme — can I edit or delete it?",
    a: "A theme is a reusable look you can apply to any song. It bundles the font, text color, size and alignment, the background, the slide animation, and even playback defaults like background audio. Apply a theme from a song's settings and every slide in that song instantly takes on its styling, so you don't have to format slides one at a time — and individual slides can still override anything afterwards. WorshipStudio ships with several built-in themes: you can edit those (change their fonts, colors, background, animation, and so on) but you can't delete them, so there's always a solid starting point. Any theme you create yourself is fully yours — edit or delete it anytime from the Themes panel (the palette icon in the header).",
  },
  {
    q: "Can I use my own colors, gradients, or images?",
    a: "Yes. In any background picker (or the Asset Library) you can upload images, choose a color from the palette, pick one with the color tool, or paste any CSS background value — a hex code, rgb/rgba, hsl, or a full linear-gradient. Each custom color is saved with the label you give it so it's easy to find later.",
  },
  {
    q: "Can I play background music during worship?",
    a: "Yes. Attach audio to a whole song, to a theme, or to a single slide, and it plays and loops softly while you present. Four gentle worship pads are built in, and you can upload your own. Background volume lives in Settings.",
  },
  {
    q: "How does auto-play work?",
    a: "Turn on Auto-play for a song (or set it on a theme) and choose how many seconds each slide should hold — slides then progress on their own with your chosen animation. With auto-play off, you move through slides manually and each one animates in as you go.",
  },
  {
    q: "How do I control the presentation?",
    a: "Use the on-screen controls or keyboard shortcuts (see the keyboard icon in the header): arrows or space to move, P to pause, F for fullscreen, V to cycle screen fit (Normal / Cover / Fill), + / - / 0 to zoom, and I to toggle the presenter bar. You can also jump straight to a section: hold Ctrl and type a number to jump to that verse (Ctrl+1 is Verse 1, Ctrl+2 is Verse 2…), or use a fixed shortcut for every other section type — Ctrl+C for Chorus, Ctrl+B for Bridge, Ctrl+I for Intro, Ctrl+O for Outro, Ctrl+P for Pre-Chorus, Ctrl+R for Refrain, and Ctrl+T for Tag. Pausing freezes everything on the current slide. When zoomed in, you can drag the slide to reposition it.",
  },
  {
    q: "Can I install WorshipStudio and use it offline?",
    a: "Yes. WorshipStudio is a Progressive Web App, so you can install it like a normal app — on desktop, click the Install icon in your browser's address bar; on phones or tablets, use “Add to Home Screen.” Once installed it opens in its own window without browser chrome and runs fully offline, since the app and your library are stored on the device. To back everything up or move to another device, use Export Data in Settings and Import Data on the other end (with options to replace or merge).",
  },
  {
    q: "Can I theme everything at once?",
    a: "Yes. A theme sets the fonts, colors, background, animation, and even playback defaults. Apply a theme to a song and every slide follows it, while individual slides can still override anything in the inspector.",
  },
];

export function AboutModal() {
  const overlay = useStore((s) => s.overlay);
  const close = useStore((s) => s.closeOverlay);
  const [open, setOpen] = useState<number | null>(0);

  return (
    <Modal
      open={overlay === "about"}
      onClose={close}
      title="About & Help"
      width={640}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontFamily: UI,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          color: C.gold,
        }}
      >
        <Sparkles size={14} /> Why WorshipStudio
      </div>
      <p
        style={{
          fontFamily: UI,
          fontSize: 14,
          color: C.text,
          lineHeight: 1.7,
          marginTop: 10,
        }}
      >
        WorshipStudio was born out of frustration. While running media at my
        church, the presentation software we relied on kept lagging mid-service
        — stuttering on hymns, images, and videos right when the congregation
        needed to follow along. Those freezes chipped away at the trust people
        had in the media team and pulled focus away from worship.
      </p>
      <p
        style={{
          fontFamily: UI,
          fontSize: 14,
          color: C.sub,
          lineHeight: 1.7,
          marginTop: 0,
        }}
      >
        I wanted something lighter and purpose-built — fast, calm, and made for
        one job: displaying worship content beautifully and reliably. That
        frustration became the spark for WorshipStudio, so the focus can stay on
        worship, not the technology.
      </p>

      <SectionTitle>Frequently Asked</SectionTitle>
      <div style={{ borderTop: `1px solid ${C.border}` }}>
        {FAQS.map((faq, i) => {
          const isOpen = open === i;
          return (
            <div key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  width: "100%",
                  padding: "13px 2px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: UI,
                  fontSize: 14,
                  fontWeight: 600,
                  color: isOpen ? C.goldSoft : C.text,
                }}
              >
                {faq.q}
                <ChevronDown
                  size={17}
                  style={{
                    flexShrink: 0,
                    transition: "transform 0.2s ease",
                    transform: isOpen ? "rotate(180deg)" : "none",
                    color: C.sub,
                  }}
                />
              </button>
              {isOpen && (
                <p
                  style={{
                    fontFamily: UI,
                    fontSize: 13.5,
                    color: C.sub,
                    lineHeight: 1.7,
                    margin: "0 0 14px",
                    paddingRight: 24,
                  }}
                >
                  {faq.a}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <SectionTitle>Scripture Data &amp; Licensing</SectionTitle>
      <p
        style={{
          fontFamily: UI,
          fontSize: 13.5,
          color: C.sub,
          lineHeight: 1.7,
          marginTop: 0,
        }}
      >
        WorshipStudio includes two Bible translations, both in the{" "}
        <strong style={{ color: C.text }}>public domain</strong>: the{" "}
        <strong style={{ color: C.text }}>King James Version (KJV)</strong> and
        the{" "}
        <strong style={{ color: C.text }}>
          American Standard Version (ASV, 1901)
        </strong>
        . Public-domain texts belong to everyone and may be read, projected,
        copied and shared freely, so using them here creates no copyright
        obligations for you or your church. (The KJV is public domain throughout
        the world except in the United Kingdom, where printing rights are held
        under Crown letters patent.)
      </p>
      <p
        style={{
          fontFamily: UI,
          fontSize: 13.5,
          color: C.sub,
          lineHeight: 1.7,
          marginTop: 0,
        }}
      >
        The Bible verses included in the app are sourced from the open-source{" "}
        <a
          href="https://www.npmjs.com/package/holy-bible"
          target="_blank"
          rel="noreferrer"
          style={{ color: C.goldSoft, fontWeight: 600 }}
        >
          holy-bible
        </a>{" "}
        library, which is licensed under the MIT License. Modern translations
        such as the NIV, ESV, NLT and NKJV are copyrighted and cannot be
        redistributed. This is why WorshipStudio does not include them.
      </p>

      <SectionTitle>Contact</SectionTitle>
      <p
        style={{
          fontFamily: UI,
          fontSize: 13.5,
          color: C.sub,
          lineHeight: 1.6,
          marginTop: 0,
        }}
      >
        Have feedback, found a bug, or want a feature? I'd genuinely love to
        hear from you.
      </p>
      <a
        href={`mailto:${CONTACT_EMAIL}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 9,
          padding: "11px 16px",
          borderRadius: 11,
          textDecoration: "none",
          fontFamily: UI,
          fontWeight: 600,
          fontSize: 14,
          color: "#231a08",
          background: `linear-gradient(140deg,${C.goldSoft},${C.gold})`,
        }}
      >
        <Mail size={16} />
        {CONTACT_EMAIL}
      </a>
      <p
        style={{
          fontFamily: DISPLAY,
          fontSize: 13,
          color: C.dim,
          marginTop: 18,
          marginBottom: 0,
        }}
      >
        Built with care, for the local church. ✝
      </p>
    </Modal>
  );
}
