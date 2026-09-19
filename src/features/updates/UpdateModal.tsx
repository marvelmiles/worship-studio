import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { fade } from "../../theme/uiTheme";
import { useUITheme } from "../../theme/ThemeProvider";
import { APP_NAME } from "../../lib/appInfo";

/** Off while the project is still being built towards its v1.0.0 release:
 *  there is no earlier version to announce changes against yet. */
export const SHOW_UPDATE = false;
const UPDATE_KEY = "ws-update-2026-09-17-r6";

const CHANGES: { title: string; body: string }[] = [
  {
    title: "The Dashboard Fits on Two Rows",
    body: "The stat tiles and the quick actions now share one grid that settles into two rows on a desktop screen. Every stat is clickable and opens the module it counts, so the number of manuscripts takes you to the library and the number of passages opens your saved passages. The quick actions are down to the three that matter: New Manuscript, Manage Themes and Upload Assets.",
  },
  {
    title: "Themes Page Rebuilt as an Editor",
    body: "Themes now works the way the manuscript editor does. Every theme sits in a sidebar that scrolls on its own while the editor beside it stays put, the theme name is edited in the top bar, and Save theme (or Ctrl+S) commits your changes. Leaving with unsaved work asks first, and deleting a theme now confirms before it goes.",
  },
  {
    title: "A Header That Never Squeezes",
    body: "The header now spends the width it has on whole icons instead of cramming them. Wide screens keep the full labelled navigation, narrower ones drop to icons, and only when even the icons will not fit does a menu button appear, holding whatever did not fit with labels and descriptions.",
  },
  {
    title: "Uploads Cancel Cleanly",
    body: "The upload dialog no longer closes when you click outside it or press the corner cross. Cancel is the one way out, and it stops the upload where it is and removes anything that batch had already added, so a half-finished import never leaves stray files in your library.",
  },
  {
    title: "A Fullscreen Reminder When You Go Live",
    body: "Going live now shows a short note explaining that F11, pressed straight after Go Live, fills the external screen, and that the fullscreen arrow at the top right corner of the live window does the same. Tick Don't show again and it stays out of the way from then on. The same explanation is now in About & Help and in the shortcuts list.",
  },
  {
    title: "Refreshed Help, Tour and Shortcuts",
    body: "About & Help, the welcome tour and the keyboard shortcut list have been rewritten around what the app actually does today: explicit saving with Ctrl+S, camera streaming, the picture, clip and text box elements on slides, the sound editor, and phone-sized layouts. Anything that no longer matched, like the old everything-auto-saves promise, is gone.",
  },
  {
    title: "A Sharper Browser Support Check",
    body: "The startup check now tests the features the app really uses, including WebRTC and camera access for streaming, Web Workers for QR pairing, canvas for the image editors and speech synthesis for reading scripture aloud, and it tells you which ones are unavailable instead of naming APIs you never touch.",
  },
  {
    title: "Consistent Alerts and Overlays",
    body: "Alerts, dialogs, drawers and every full-screen overlay now take their scrim, shadow and text colors from the theme rather than hardcoding them, so the whole app stays in one palette. The last browser alert box in the app has been replaced with a themed notice.",
  },
];

export const UpdateModal = () => {
  const { colors, fonts, glass, shadows } = useUITheme();
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
        background: colors.scrim,
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
          background: colors.panel,
          boxShadow: shadows.overlay,
        }}
      >
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: `1px solid ${colors.border}`,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontFamily: fonts.ui,
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
              fontFamily: fonts.display,
              fontSize: 22,
              fontWeight: 700,
              color: colors.text,
            }}
          >
            {APP_NAME} Update
          </h2>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 13,
              color: colors.sub,
              fontFamily: fonts.ui,
            }}
          >
            Scroll through the changes below, then click{" "}
            <strong style={{ color: colors.text }}>Understood</strong> to
            continue.
          </p>
        </div>

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
                    color: colors.onAccent,
                    flexShrink: 0,
                    fontFamily: fonts.ui,
                  }}
                >
                  {i + 1}
                </span>
                <h3
                  style={{
                    margin: 0,
                    fontFamily: fonts.display,
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
                  fontFamily: fonts.ui,
                  paddingLeft: 32,
                }}
              >
                {item.body}
              </p>
            </div>
          ))}

          <div style={{ height: 8 }} />
        </div>

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
              fontFamily: fonts.ui,
              fontSize: 14,
              fontWeight: 700,
              cursor: atBottom ? "pointer" : "not-allowed",
              background: atBottom
                ? `linear-gradient(135deg,${colors.accentSoft},${colors.accent})`
                : fade(colors.text, 0.07),
              color: atBottom ? colors.onAccent : colors.dim,
              transition: "background 0.25s, color 0.25s",
            }}
          >
            {atBottom ? (
              "Understood"
            ) : (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                Scroll to continue
                <ChevronDown size={15} />
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
