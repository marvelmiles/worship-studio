import { useState } from "react";
import { ChevronDown, Heart, Mail } from "lucide-react";
import { useStore } from "../../store/useStore";
import { useUITheme } from "../../theme/ThemeProvider";
import { Modal } from "../../components/ui/Modal";
import { APP_VERSION_LABEL } from "../../lib/appVersion";
import { SectionTitle } from "../../components/ui/Field";

const CONTACT_EMAIL = "marvellousabidemi2@gmail.com";

const FAQS: { q: string; a: string }[] = [
  {
    q: "How do I present to a projector or TV over HDMI?",
    a: "Connect your computer to the screen with HDMI and set the display to extend (not mirror) your desktop. Open a manuscript, Bible passage, image or video, click Present, then choose Go Live. The first time, your browser asks permission to manage windows; allow it. WorshipStudio then opens the audience window on the external display while you keep the controls and presenter notes on your own screen. If your browser doesn't support multi-screen placement, Go Live opens the window on the current screen, which you can drag onto the projector. When projection is active the Go Live button stays highlighted.",
  },
  {
    q: "The external screen isn't fullscreen. How do I fill it?",
    a: "Press F11 straight after Go Live, while the live window still has focus, and it fills the screen it is sitting on. You can also move the pointer over that window and click the fullscreen arrow at its top right corner, or press F on it. F11 again, or Esc, leaves fullscreen. WorshipStudio asks for fullscreen itself as soon as the window lands on the projector, so most of the time there is nothing to do; browsers only refuse that request when the click that opened the window has already been spent.",
  },
  {
    q: "How do I save my work?",
    a: "Every editor holds your changes as a draft until you save them, so you can experiment freely. The Save button in the editor's top bar turns blue as soon as there is something unsaved, Ctrl+S saves without reaching for it, and if you try to leave the page with unsaved work you are asked first. Ctrl+Z and Ctrl+Y undo and redo while you edit, and one undo step covers everything the editor holds: typing, formatting, slide changes and picture or clip settings alike. While a document is already being presented, Ctrl+Shift+U pushes your saved changes into the running presentation.",
  },
  {
    q: "How do I present a Bible verse?",
    a: "Open the Bible tab and pick a book, then a chapter, then a verse; the reader opens scrolled to it (the breadcrumb at the top takes you back to books, chapters or verses at any point). You can switch between the King James Version and the American Standard Version from the dropdown, or type a reference like John 3:16-18 in the reader's jump box. Click a verse to select it, Ctrl-click (or Shift+Up/Down) to extend the selection, then hit Present to project it immediately (double-clicking a verse does the same for just that verse), or hit Edit to fine-tune the slides first. Save Passage keeps the selection as styled slides you can restyle, re-chunk and present later from the Saved tab.",
  },
  {
    q: "How do I type a Bible reference? Can I abbreviate book names?",
    a: "Yes. Anywhere you type a reference, like the reader's Go to reference box, the book part accepts the full name or any common abbreviation: John 3:16, Jn 3:16, Gen 1:1, Ps 23, 1 Cor 13:4-7 all work. Every book has several recognized short forms (Jn, Jhn or Joh for John; Mt or Matt for Matthew; Ps, Psa or Psalm for Psalms; 1Co or 1Cor for 1 Corinthians, and so on), and beyond those, just the start of a book's name is enough: Gene finds Genesis, Eccl finds Ecclesiastes. Capitalization, dots and spacing don't matter, so 1 cor. 13:4 is fine. Then add :verse for a specific verse (John 3:16), a dash for a range (John 3:16-18), or stop at the chapter (John 3) to open it at its first verse; a book name alone opens chapter 1. The same abbreviations work when filtering books in the Bible tab's search box.",
  },
  {
    q: "Does the Bible work offline?",
    a: "Yes, completely. The full text of both translations (KJV and ASV) ships inside the app itself, so reading, verse search and saved passages all work with no internet connection at all. Nothing is ever fetched from an online Bible service. See the Scripture Data & Licensing section below for where the text comes from.",
  },
  {
    q: "How do I put a phone camera on the screen?",
    a: "Open the Stream tab. On the projecting computer choose “Show a camera here”; on the phone open the same app and choose “Share this camera”. Pair them either by pointing the phone at the QR code on the computer or by typing the short code, and the two connect directly over your WiFi. Once joined you can project a camera full screen, keep another one in a corner of it or waiting off screen to cut to, and open a floating preview of any camera for yourself before it reaches the broadcast. Both devices must be on an https:// address, because browsers only open cameras on a secure connection, and the broadcast keeps running even if the phone's screen goes to sleep.",
  },
  {
    q: "Can I put text or pictures over a live camera?",
    a: "Yes. While a camera is being projected, the overlay panel lays a lower third, a full text block, a scrolling announcement band, a picture or a clip over the picture, including a Bible passage pulled straight from your saved passages. Each overlay has its own placement, size and appearance, and you can bring it in and take it back off without touching the camera feed.",
  },
  {
    q: "Can I edit images, videos and sounds?",
    a: "Yes, and all three editors are non-destructive, so your original file is never altered. Images: brightness, contrast, saturation, grayscale, sepia, blur, rotate, flip, screen fit and a legibility overlay. Videos: trim start and end (with set-to-playhead), volume, mute, loop, playback speed, screen fit and the same color adjustments. Sounds get their own editor for trimming and levels. Space plays and pauses the preview in the video and audio editors. While a video is live you get play/pause, seeking, restart and volume controls on your console, any image can be added to your background library with one click, and any video can become a moving background or a slide's audio.",
  },
  {
    q: "How do I turn lyrics into slides?",
    a: "Paste lyrics, a hymn or a sermon outline into a manuscript and WorshipStudio builds the slides automatically. Start the text with a line like HYMN: Ancient Words or SERMON: The Good Shepherd and that line names the manuscript and files it in the matching collection instead of becoming a slide. You can tag sections with [verse] (or [solo], which is treated the same as a verse), [chorus], [bridge], [intro], [outro], [tag], [refrain] or [pre-chorus] for clean labels and auto-numbering, or just separate sections with blank lines. You can also give a tag its own number, like [Verse 3]; it'll keep that number and the verses will be sorted into order automatically even if you typed them out of sequence. Long sections are split for you, and you can set the maximum lines per slide. Highlight any word or sentence in the editor and use the formatting toolbar for bold, italic, underline, strikethrough and highlight.",
  },
  {
    q: "Can I split, merge, duplicate, or reorder slides?",
    a: "Yes, building a set is meant to be quick. In the slide inspector you'll find buttons to duplicate a slide, split it into two, merge it into the next one, or delete it. You can drag slides to reorder them, right-click (or long-press) a slide for the same actions in a menu, and insert a new blank slide anywhere. You can also place pictures, clips and free text boxes anywhere on a slide, nudge them with the arrow keys and remove them with Delete. Save when the set looks right.",
  },
  {
    q: "What happens if I cancel an upload?",
    a: "The upload dialog stays put until you decide: clicking outside it does nothing, and Cancel is the only way to close it. Cancelling stops the upload where it is and removes anything that batch had already added, so you never end up with half a set of files in your library. Give each file a label before saving and it is easy to find later; labels default to the file name.",
  },
  {
    q: "What's the difference between default and custom assets?",
    a: "Default themes, backgrounds, and sounds ship with the app so you always have something to work with; they can't be deleted (default themes can still be edited). Anything you add yourself (uploaded images, custom colors, audio files, or new themes) is custom and can be edited or deleted freely. You can also mark a custom item to be kept when you reset the app.",
  },
  {
    q: "What is a theme? Can I edit or delete it?",
    a: "A theme is a reusable look you can apply to any manuscript. It bundles the font, text color, size and alignment, the background, the slide animation, and even playback defaults like background audio. Apply a theme from a manuscript's settings and every slide in it instantly takes on that styling, so you don't have to format slides one at a time, and individual slides can still override anything afterwards. The Themes page (the palette icon in the header) works like an editor: every theme sits in a sidebar that scrolls on its own, and the one you pick opens beside it with a live preview, saved with its own Save button. WorshipStudio ships with several built-in themes: you can edit those but you can't delete them, so there's always a solid starting point. Any theme you create yourself is fully yours; edit or delete it anytime.",
  },
  {
    q: "Can I use my own colors, gradients, or images?",
    a: "Yes. In any background picker (or the Asset Library) you can upload images, choose a color from the palette, pick one with the color tool, or paste any CSS background value: a hex code, rgb/rgba, hsl, or a full linear-gradient. Each custom color is saved with the label you give it so it's easy to find later, and a video can be used as a moving background too.",
  },
  {
    q: "Can I play background music during worship?",
    a: "Yes. Attach audio to a whole manuscript, to a theme, or to a single slide, and it plays and loops softly while you present. Gentle worship pads are built in, you can upload your own, and a video's own soundtrack can be turned into a sound. Background volume lives in Settings.",
  },
  {
    q: "How does auto-play work?",
    a: "Turn on Auto-play for a manuscript (or set it on a theme) and choose how many seconds each slide should hold; slides then progress on their own with your chosen animation. With auto-play off, you move through slides manually and each one animates in as you go.",
  },
  {
    q: "How do I control the presentation?",
    a: "Use the on-screen controls or keyboard shortcuts (see the keyboard icon in the header): arrows or space to move, P to pause, F for fullscreen, V to cycle screen fit (Normal / Cover / Fill), + / - / 0 to zoom, and I to toggle the presenter bar. You can also jump straight to a section: hold Ctrl and type a number to jump to that verse (Ctrl+1 is Verse 1, Ctrl+2 is Verse 2 and so on), or use a fixed shortcut for every other section type, Ctrl+C for Chorus, Ctrl+B for Bridge, Ctrl+I for Intro, Ctrl+O for Outro, Ctrl+P for Pre-Chorus, Ctrl+R for Refrain, and Ctrl+T for Tag. Pausing freezes everything on the current slide. When zoomed in, you can drag the slide to reposition it. The floating presenter only takes the keyboard while it is focused, so click it before using these keys and click away to type normally again.",
  },
  {
    q: "Does it work on a phone or tablet?",
    a: "Yes. Every page is laid out for small screens first: editors stack into Slides / Edit / Style tabs, libraries reflow into a single column, and the header spends the width it has on whole icons rather than squeezing them, opening a menu for whatever does not fit. Projecting to a second display still needs a computer, but a phone makes a fine camera for the Stream tab.",
  },
  {
    q: "Can I install WorshipStudio and use it offline?",
    a: "Yes. WorshipStudio is a Progressive Web App, so you can install it like a normal app: on desktop, click the Install icon in your browser's address bar; on phones or tablets, use “Add to Home Screen”. Once installed it opens in its own window without browser chrome and runs fully offline, since the app and your library are stored on the device. To back everything up or move to another device, use Export Data in Settings and Import Data on the other end (with options to replace or merge). Live camera streaming is the one part that needs both devices on the same network.",
  },
];

export const AboutModal = () => {
  const { colors, fonts } = useUITheme();
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
          fontFamily: fonts.ui,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          color: colors.accent,
        }}
      >
        <Heart size={14} /> Why WorshipStudio
      </div>
      <p
        style={{
          fontFamily: fonts.ui,
          fontSize: 14,
          color: colors.text,
          lineHeight: 1.7,
          marginTop: 10,
        }}
      >
        WorshipStudio was born out of frustration. While running media at my
        church, the presentation software we relied on kept lagging mid-service,
        stuttering on hymns, images, and videos right when the congregation
        needed to follow along. Those freezes chipped away at the trust people
        had in the media team and pulled focus away from worship.
      </p>
      <p
        style={{
          fontFamily: fonts.ui,
          fontSize: 14,
          color: colors.sub,
          lineHeight: 1.7,
          marginTop: 0,
        }}
      >
        I wanted something lighter and purpose-built: fast, calm, and made for
        one job, displaying worship content beautifully and reliably. That
        frustration became the spark for WorshipStudio, so the focus can stay on
        worship, not the technology.
      </p>

      <SectionTitle>Frequently Asked</SectionTitle>
      <div style={{ borderTop: `1px solid ${colors.border}` }}>
        {FAQS.map((faq, i) => {
          const isOpen = open === i;
          return (
            <div key={i} style={{ borderBottom: `1px solid ${colors.border}` }}>
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
                  fontFamily: fonts.ui,
                  fontSize: 14,
                  fontWeight: 600,
                  color: isOpen ? colors.accentSoft : colors.text,
                }}
              >
                {faq.q}
                <ChevronDown
                  size={17}
                  style={{
                    flexShrink: 0,
                    transition: "transform 0.2s ease",
                    transform: isOpen ? "rotate(180deg)" : "none",
                    color: colors.sub,
                  }}
                />
              </button>
              {isOpen && (
                <p
                  style={{
                    fontFamily: fonts.ui,
                    fontSize: 13.5,
                    color: colors.sub,
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
          fontFamily: fonts.ui,
          fontSize: 13.5,
          color: colors.sub,
          lineHeight: 1.7,
          marginTop: 0,
        }}
      >
        WorshipStudio includes two Bible translations, both in the{" "}
        <strong style={{ color: colors.text }}>public domain</strong>: the{" "}
        <strong style={{ color: colors.text }}>King James Version (KJV)</strong>{" "}
        and the{" "}
        <strong style={{ color: colors.text }}>
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
          fontFamily: fonts.ui,
          fontSize: 13.5,
          color: colors.sub,
          lineHeight: 1.7,
          marginTop: 0,
        }}
      >
        The Bible verses included in the app are sourced from the open-source{" "}
        <a
          href="https://www.npmjs.com/package/holy-bible"
          target="_blank"
          rel="noreferrer"
          style={{ color: colors.accentSoft, fontWeight: 600 }}
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
          fontFamily: fonts.ui,
          fontSize: 13.5,
          color: colors.sub,
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
          fontFamily: fonts.ui,
          fontWeight: 600,
          fontSize: 14,
          color: "#ffffff",
          background: `linear-gradient(140deg,${colors.accentSoft},${colors.accent})`,
        }}
      >
        <Mail size={16} />
        {CONTACT_EMAIL}
      </a>
      <p
        style={{
          margin: "18px 0 0",
          fontFamily: fonts.ui,
          fontSize: 12,
          color: colors.dim,
        }}
      >
        WorshipStudio {APP_VERSION_LABEL}
      </p>
    </Modal>
  );
};
