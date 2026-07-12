import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { useStore } from "../../store/useStore";
import { resolveAnimation, resolveBackground, resolveLineStyle, resolveStyle } from "../../lib/resolve";
import { openPresentChannel, type PresentState } from "../../lib/presentChannel";
import { Stage } from "./Stage";
import type { Background } from "../../types";

/**
 * Renders in the popup window opened by Go Live. Mirrors whatever the
 * operator console is showing via BroadcastChannel — no controls, no
 * presenter bar, just the stage that gets projected to the audience.
 */
export function PresentWindow() {
  const songs = useStore((s) => s.songs);
  const themes = useStore((s) => s.themes);
  const backgrounds = useStore((s) => s.backgrounds);
  const prefs = useStore((s) => s.prefs);

  const [state, setState] = useState<PresentState | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hintVisible, setHintVisible] = useState(true);
  const hideTimer = useRef<number>();

  useEffect(() => {
    const channel = openPresentChannel((msg) => {
      if (msg.type === "state") setState(msg.state);
    });
    channel.postMessage({ type: "request-state" });
    return () => channel.close();
  }, []);

  useEffect(() => {
    document.title = "WorshipStudio — Live";
    document.body.style.background = "#000";
    document.body.style.margin = "0";
  }, []);

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

  const song = useMemo(() => songs.find((s) => s.id === state?.songId), [songs, state?.songId]);
  const theme = useMemo(
    () => themes.find((t) => t.id === song?.defaultThemeId) || themes[0],
    [themes, song?.defaultThemeId]
  );
  const bgMap = useMemo(() => {
    const map: Record<string, Background> = {};
    for (const bg of backgrounds) map[bg.id] = bg;
    return map;
  }, [backgrounds]);

  const cur = song?.slides?.[state?.idx ?? 0];
  const style = theme ? resolveStyle(cur, song, theme) : undefined;
  const lineStyles = theme && cur ? cur.lines.map((_, i) => resolveLineStyle(cur, i, song, theme)) : undefined;
  const background = theme ? resolveBackground(cur, song, theme, bgMap) : undefined;
  const animation = theme ? resolveAnimation(cur, song, theme, prefs.transition) : prefs.transition;

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
        background: "rgba(10,9,14,0.55)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255,255,255,0.1)",
        color: "#fff",
        opacity: hintVisible ? 1 : 0,
        pointerEvents: hintVisible ? "auto" : "none",
        transition: "opacity 0.3s ease",
      }}
    >
      {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
    </button>
  );

  if (!state || !song || !cur || !style || !background || !theme) {
    return (
      <div onPointerMove={wake} onPointerDown={claimFocus} style={{ position: "fixed", inset: 0, background: "#000" }}>
        {fullscreenButton}
      </div>
    );
  }

  return (
    <div
      onPointerMove={wake}
      onPointerDown={claimFocus}
      style={{ position: "fixed", inset: 0, background: "#000" }}
    >
      <Stage
        idx={state.idx}
        slide={cur}
        style={style}
        lineStyles={lineStyles}
        background={background}
        animation={animation}
        view={state.view}
        zoom={state.zoom}
        pan={state.pan}
        onPanBy={() => {}}
        durationMs={prefs.transitionDuration}
        easing={prefs.easing}
      />
      {fullscreenButton}
    </div>
  );
}
