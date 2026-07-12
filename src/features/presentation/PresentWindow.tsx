import { useEffect, useMemo, useState } from "react";
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

  if (!state || !song || !cur || !style || !background || !theme) {
    return <div style={{ position: "fixed", inset: 0, background: "#000" }} />;
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000" }}>
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
    </div>
  );
}
