import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { useStore } from "../../store/useStore";
import { useUITheme } from "../../theme/ThemeProvider";
import { useBgMap } from "../../hooks/useBgMap";
import { openPresentChannel, type PresentState } from "../../lib/presentChannel";
import { useDeck } from "./useDeck";
import { buildStageFrame } from "./stageContent";
import { Stage } from "./Stage";

/**
 * Renders in the popup window opened by Go Live. Mirrors whatever the
 * operator console is showing via BroadcastChannel, no controls, no
 * presenter bar, just the stage that gets projected to the audience.
 */
export function PresentWindow() {
  const { stage } = useUITheme();
  const prefs = useStore((s) => s.prefs);
  const load = useStore((s) => s.load);

  const [state, setState] = useState<PresentState | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hintVisible, setHintVisible] = useState(true);
  const hideTimer = useRef<number>();
  const lastReloadKey = useRef<string>("");

  useEffect(() => {
    const channel = openPresentChannel((msg) => {
      if (msg.type === "state") setState(msg.state);
    });
    channel.postMessage({ type: "request-state" });
    return () => channel.close();
  }, []);

  useEffect(() => {
    document.title = "WorshipStudio · Live";
    document.body.style.background = stage.surface;
    document.body.style.margin = "0";
  }, [stage.surface]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    hideTimer.current = window.setTimeout(() => setHintVisible(false), 2500);
    return () => window.clearTimeout(hideTimer.current);
  }, []);

  const wake = () => {
    setHintVisible(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setHintVisible(false), 2500);
  };

  // A programmatically opened, auto-fullscreened popup on a second monitor
  // sometimes doesn't get OS window activation from a plain click (a known
  // Windows/Chrome quirk with fullscreen surfaces). Calling focus() from a
  // real pointerdown inside this window's own document reliably claims it.
  const claimFocus = () => {
    try {
      window.focus();
    } catch {
      /* ignore */
    }
  };

  const toggleFullscreen = () => {
    try {
      if (document.fullscreenElement) void document.exitFullscreen?.();
      else void document.documentElement.requestFullscreen?.();
    } catch {
      /* fullscreen can be blocked by the browser; ignore */
    }
  };

  const deck = useDeck(state?.kind, state?.id);
  const bgMap = useBgMap();

  // This window loads its store once on open; content created or edited after
  // that would be missing here, so reload from storage when the operator's
  // broadcast references something newer than our copy. The key resets after a
  // moment so a reload that raced the operator's write gets retried.
  useEffect(() => {
    if (!state) return;
    const stale = !deck || (state.rev && deck.rev !== state.rev);
    if (!stale) return;
    const key = `${state.kind}:${state.id}:${state.rev || ""}`;
    if (lastReloadKey.current === key) return;
    lastReloadKey.current = key;
    void load();
    const timer = window.setTimeout(() => {
      if (lastReloadKey.current === key) lastReloadKey.current = "";
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [state, deck, load]);

  const frame = deck && state ? buildStageFrame(deck, deck.slides[state.slideIndex], bgMap, prefs.transition) : null;

  const fullscreenButton = (
    <button
      onClick={toggleFullscreen}
      title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
      style={{
        position: "fixed",
        top: 14,
        right: 14,
        zIndex: 10,
        width: 38,
        height: 38,
        display: "grid",
        placeItems: "center",
        borderRadius: 10,
        cursor: "pointer",
        background: stage.overlay,
        backdropFilter: "blur(10px)",
        border: `1px solid ${stage.border}`,
        color: stage.text,
        opacity: hintVisible ? 1 : 0,
        pointerEvents: hintVisible ? "auto" : "none",
        transition: "opacity 0.3s ease",
      }}
    >
      {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
    </button>
  );

  if (!state || !frame) {
    return (
      <div onPointerMove={wake} onPointerDown={claimFocus} style={{ position: "fixed", inset: 0, background: stage.surface }}>
        {fullscreenButton}
      </div>
    );
  }

  return (
    <div
      onPointerMove={wake}
      onPointerDown={claimFocus}
      style={{ position: "fixed", inset: 0, background: stage.surface }}
    >
      <Stage
        slideIndex={state.slideIndex}
        content={frame.content}
        animation={frame.animation}
        view={state.view}
        zoom={state.zoom}
        pan={state.pan}
        onPanBy={() => {}}
        durationMs={prefs.transitionDuration}
        easing={prefs.easing}
        playback={state.media}
      />
      {fullscreenButton}
    </div>
  );
}
