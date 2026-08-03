import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Cross,
  FileText,
  Film,
  HelpCircle,
  Image as ImageIcon,
  Keyboard,
  MonitorUp,
  Palette,
  Save,
  Settings,
  WifiOff,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useStore } from "../../store/useStore";
import { fade, colors, DISPLAY, UI, glass } from "../../theme/tokens";
import { Button } from "../../components/ui/Button";

const TIPS: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: Save,
    title: "Everything auto-saves",
    desc: "There's no Save button. Edits, restyling, reordering, inserting slides, and any setting are stored on your device the moment you make them.",
  },
  {
    icon: FileText,
    title: "Lyrics become slides, then shape them",
    desc: "Paste lyrics (optionally tagged [verse], [chorus] or [bridge]; [solo] counts as a verse too) and WorshipStudio builds clean, auto-numbered slides. From there it's easy to build the flow: split a slide in two, merge it into the next, duplicate, reorder by dragging, or insert a new slide, all from the slide inspector or by right-clicking a slide.",
  },
  {
    icon: BookOpen,
    title: "Project scripture in seconds",
    desc: "Open the Bible tab, pick a version (KJV or ASV), click verses to select them, and hit Present, or save the passage as styled slides you can edit like any manuscript. The full text is built in, so the whole Bible works offline.",
  },
  {
    icon: Film,
    title: "Images and videos too",
    desc: "Upload images and videos from their tabs, polish them with the built-in editors (filters, rotate, trim, volume…), and project them the same way. Presenting an image lets you flip through your whole image library like a slideshow.",
  },
  {
    icon: MonitorUp,
    title: "Present over HDMI",
    desc: "Connect a projector or TV, click Present, then Go Live to project fullscreen on that screen while you keep the controls and notes on yours. Manuscripts, scripture, images and videos all go live the same way.",
  },
  {
    icon: Palette,
    title: "Themes do the styling for you",
    desc: "A theme is a saved look: font, text color, size, background, animation and even background audio, bundled together. Pick a theme in a manuscript's settings and every slide in it instantly follows it, so you style once instead of slide by slide. Built-in themes can be edited (not deleted) and you can create your own from the palette icon; change a theme and the manuscripts using it update to match. Any individual slide can still override the look in the inspector.",
  },
  {
    icon: WifiOff,
    title: "Install it & use it offline",
    desc: 'WorshipStudio can be installed straight from your browser. Look for Install in the address bar, or "Add to Home Screen" on mobile. It then opens in its own window and runs fully offline; your whole library is saved on the device. Back up or move to another device with Export / Import in Settings.',
  },
];

const HEADER_ICONS: { icon: LucideIcon; name: string; desc: string }[] = [
  {
    icon: HelpCircle,
    name: "About & Help",
    desc: "The story behind the app, FAQs, and how to reach me.",
  },
  {
    icon: ImageIcon,
    name: "Asset Library",
    desc: "Manage background images, custom colors, and audio.",
  },
  {
    icon: Palette,
    name: "Themes",
    desc: "Create and edit looks: fonts, colors, background, animation, playback.",
  },
  {
    icon: Keyboard,
    name: "Shortcuts",
    desc: "Every keyboard control available while presenting.",
  },
  {
    icon: Settings,
    name: "Settings",
    desc: "Presentation options, transitions, audio, backup, and reset.",
  },
];

export function GuideModal() {
  const showGuide = useStore((s) => s.showGuide);
  const completeGuide = useStore((s) => s.completeGuide);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [reachedEnd, setReachedEnd] = useState(false);

  useEffect(() => {
    const el = bodyRef.current;
    if (showGuide && el && el.scrollHeight <= el.clientHeight + 8)
      setReachedEnd(true);
  }, [showGuide]);

  if (!showGuide) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 320,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
        background: fade(colors.bg, 0.82),
        backdropFilter: "blur(8px)",
        animation: "wfFade .2s ease",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 580,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: 18,
          overflow: "hidden",
          background: colors.panel,
          backdropFilter: glass.backdropFilter,
          WebkitBackdropFilter: glass.WebkitBackdropFilter,
          border: `1px solid ${colors.border}`,
          boxShadow: "0 24px 48px rgba(0,0,0,0.45)",
        }}
      >
        <div
          style={{
            padding: "22px 24px 16px",
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <div
            style={{
              fontFamily: UI,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.6,
              textTransform: "uppercase",
              color: colors.accent,
            }}
          >
            Welcome
          </div>
          <h2
            style={{
              margin: "4px 0 0",
              fontFamily: DISPLAY,
              fontSize: 25,
              fontWeight: 600,
              color: colors.text,
            }}
          >
            A quick tour of WorshipStudio
          </h2>
        </div>

        <div
          ref={bodyRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8)
              setReachedEnd(true);
          }}
          style={{ padding: 24, overflowY: "auto", flex: 1 }}
        >
          <p
            style={{
              fontFamily: UI,
              fontSize: 14,
              color: colors.sub,
              lineHeight: 1.7,
              marginTop: 0,
            }}
          >
            WorshipStudio is a light, distraction-free studio for presenting
            manuscripts, scripture, images and videos reliably. Here are a few
            things worth knowing before you start.
          </p>

          {TIPS.map((tip) => (
            <div
              key={tip.title}
              style={{ display: "flex", gap: 13, marginBottom: 16 }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  flexShrink: 0,
                  borderRadius: 10,
                  display: "grid",
                  placeItems: "center",
                  background: fade(colors.accent, 0.14),
                  color: colors.accentSoft,
                }}
              >
                <tip.icon size={18} />
              </div>
              <div>
                <div
                  style={{
                    fontFamily: UI,
                    fontSize: 14.5,
                    fontWeight: 600,
                    color: colors.text,
                  }}
                >
                  {tip.title}
                </div>
                <div
                  style={{
                    fontFamily: UI,
                    fontSize: 13,
                    color: colors.sub,
                    lineHeight: 1.6,
                    marginTop: 2,
                  }}
                >
                  {tip.desc}
                </div>
              </div>
            </div>
          ))}

          <h3
            style={{
              fontFamily: DISPLAY,
              fontSize: 17,
              color: colors.text,
              margin: "22px 0 12px",
            }}
          >
            What the header icons do
          </h3>
          {HEADER_ICONS.map((item) => (
            <div
              key={item.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 13,
                padding: "9px 0",
                borderBottom: `1px solid ${colors.border}`,
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  flexShrink: 0,
                  borderRadius: 9,
                  display: "grid",
                  placeItems: "center",
                  background: colors.raise,
                  color: colors.text,
                }}
              >
                <item.icon size={16} />
              </div>
              <div>
                <div
                  style={{
                    fontFamily: UI,
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: colors.text,
                  }}
                >
                  {item.name}
                </div>
                <div
                  style={{
                    fontFamily: UI,
                    fontSize: 12.5,
                    color: colors.sub,
                    lineHeight: 1.5,
                  }}
                >
                  {item.desc}
                </div>
              </div>
            </div>
          ))}

          <p
            style={{
              fontFamily: UI,
              fontSize: 13.5,
              color: colors.sub,
              lineHeight: 1.7,
              margin: "20px 0 0",
            }}
          >
            That's it, create a manuscript from the dashboard or open the
            library to start. You can revisit all of this anytime under About
            &amp; Help. Welcome aboard.
            <Cross
              size={13}
              style={{
                display: "inline",
                verticalAlign: "middle",
                marginLeft: 5,
              }}
            />
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "14px 24px",
            borderTop: `1px solid ${colors.border}`,
          }}
        >
          <span
            style={{
              fontFamily: UI,
              fontSize: 12.5,
              color: reachedEnd ? colors.dim : colors.accent,
            }}
          >
            {reachedEnd ? "You're all set." : "Scroll to the end to continue"}
          </span>
          <Button
            variant="primary"
            disabled={!reachedEnd}
            onClick={completeGuide}
          >
            Understood
          </Button>
        </div>
      </div>
    </div>
  );
}
