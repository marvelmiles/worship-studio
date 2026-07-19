import { useEffect, useRef, useState } from "react";
import { colors, DISPLAY, UI, glass } from "../../theme/tokens";

// Set SHOW_UPDATE to true to show the modal on load; bump UPDATE_KEY so
// returning users see it again.
export const SHOW_UPDATE = true;
const UPDATE_KEY = "ws-update-2026-06-14-r4";

const CHANGES: { title: string; body: string }[] = [
  {
    title: "Per-Song Keyboard Shortcut Mode",
    body: 'Songs now have a Keyboard Shortcut Mode setting in Song Settings → Keyboard Shortcuts. Choose "Tag first slide only" (default) to assign Ctrl+number shortcuts to the first slide of each section, or "Every slide" to assign a unique number to each individual slide for granular navigation during presentation.',
  },
  {
    title: "Keyboard Shortcuts: Clearer Ctrl Key",
    body: 'Keyboard shortcuts in the song slide list now display a bold, raised "Ctrl" key badge so you can instantly see which keys to press. The shortcut for jumping to the first Chorus slide (Ctrl+C) is highlighted.',
  },
  {
    title: "Classic Theme: Larger Default Font",
    body: "The Classic Worship theme now defaults to a font size of 6 (up from 5.6) for better on-screen readability, and it is listed first in the theme picker.",
  },
  {
    title: "Split Slides No Longer Inherit Shortcuts",
    body: "When you split a slide (or the parser auto-splits a long section into multiple slides), only the original first slide of that section keeps its Ctrl+number shortcut. Any newly created split slide will never be assigned its own shortcut number, keeping navigation clean and predictable.",
  },
  {
    title: "Regenerate Slides Selects the First Slide",
    body: "After clicking Regenerate Slides from the lyrics editor, the first slide of the newly generated set is now automatically selected so you can immediately start reviewing or editing it.",
  },
  {
    title: "New Slide Inserts After Current Slide",
    body: "When you add a new slide in the editor, it now inserts immediately after the currently selected slide instead of appending to the end of the list. This makes it much faster to build out a song without having to drag the new slide into position.",
  },
  {
    title: "Slide Background Shown in Presentation Mode",
    body: "The presentation stage now renders each slide's own background (image, solid colour, or gradient) directly on the stage so the background fills the entire screen, not just the slide canvas area. The previous solid-black backdrop is gone.",
  },
  {
    title: "PWA Auto-Updates When You Return to the App",
    body: "The installed PWA now checks for a new version every time you bring the app back into the foreground (e.g. after switching away and returning). Updates apply automatically in the background with no manual refresh needed. It also polls for updates once per hour while the tab stays open.",
  },
  {
    title: "Update Notifications",
    body: "WorshipStudio now shows a brief update modal when new features or improvements arrive. Scroll to the bottom and click \"Understood\" to dismiss it; it will not show again unless there is something new.",
  },
];

export function UpdateModal() {
  const [open, setOpen] = useState(false);
  const [atBottom, setAtBottom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!SHOW_UPDATE) return;
    const seen = localStorage.getItem(UPDATE_KEY);
    if (!seen) setOpen(true);
  }, []);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (remaining < 24) setAtBottom(true);
  };

  const handleDismiss = () => {
    localStorage.setItem(UPDATE_KEY, "1");
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: "rgba(6,5,9,0.82)",
        backdropFilter: "blur(8px)",
        animation: "wfFade .2s ease",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          display: "flex",
          flexDirection: "column",
          maxHeight: "88vh",
          ...glass,
          background: "rgba(22,19,36,0.72)",
          boxShadow: "0 30px 80px rgba(0,0,0,0.65)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: `1px solid ${colors.border}`,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontFamily: UI,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              color: colors.accent,
              marginBottom: 6,
            }}
          >
            What&rsquo;s New
          </div>
          <h2
            style={{
              margin: 0,
              fontFamily: DISPLAY,
              fontSize: 22,
              fontWeight: 700,
              color: colors.text,
            }}
          >
            WorshipStudio Update
          </h2>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: colors.sub, fontFamily: UI }}>
            Scroll through the changes below, then click <strong style={{ color: colors.text }}>Understood</strong> to continue.
          </p>
        </div>

        {/* Scrollable content */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {CHANGES.map((item, i) => (
            <div key={i}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: `linear-gradient(140deg,${colors.accentSoft},${colors.accent})`,
                    display: "grid",
                    placeItems: "center",
                    fontSize: 11,
                    fontWeight: 800,
                    color: "#ffffff",
                    flexShrink: 0,
                    fontFamily: UI,
                  }}
                >
                  {i + 1}
                </span>
                <h3
                  style={{
                    margin: 0,
                    fontFamily: DISPLAY,
                    fontSize: 16,
                    fontWeight: 600,
                    color: colors.text,
                  }}
                >
                  {item.title}
                </h3>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 13.5,
                  lineHeight: 1.65,
                  color: colors.sub,
                  fontFamily: UI,
                  paddingLeft: 32,
                }}
              >
                {item.body}
              </p>
            </div>
          ))}

          {/* Spacer so there's always something to scroll to */}
          <div style={{ height: 8 }} />
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: `1px solid ${colors.border}`,
            display: "flex",
            justifyContent: "flex-end",
            flexShrink: 0,
          }}
        >
          <button
            onClick={atBottom ? handleDismiss : undefined}
            disabled={!atBottom}
            style={{
              padding: "9px 24px",
              borderRadius: 9,
              border: "none",
              fontFamily: UI,
              fontSize: 14,
              fontWeight: 700,
              cursor: atBottom ? "pointer" : "not-allowed",
              background: atBottom
                ? `linear-gradient(135deg,${colors.accentSoft},${colors.accent})`
                : "rgba(255,255,255,0.07)",
              color: atBottom ? "#ffffff" : colors.dim,
              transition: "background 0.25s, color 0.25s",
            }}
          >
            {atBottom ? "Understood" : "Scroll to continue ↓"}
          </button>
        </div>
      </div>
    </div>
  );
}
