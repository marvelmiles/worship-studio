import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Background, PresentationView } from "../../types";
import { useStore } from "../../store/useStore";
import { useFullscreen } from "../../hooks/useFullscreen";
import {
  resolveAnimation,
  resolveAudioId,
  resolveAutoPlay,
  resolveBackground,
  resolveSlideDuration,
  resolveStyle,
} from "../../lib/resolve";
import { computeTagGroups } from "../../lib/tagGroups";

const VIEW_ORDER: PresentationView[] = ["normal", "cover", "fill"];
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.1;

export function usePresentation() {
  const presentation = useStore((s) => s.presentation);
  const songs = useStore((s) => s.songs);
  const themes = useStore((s) => s.themes);
  const backgrounds = useStore((s) => s.backgrounds);
  const audio = useStore((s) => s.audio);
  const prefs = useStore((s) => s.prefs);
  const stopPresent = useStore((s) => s.stopPresent);

  const song = useMemo(
    () => songs.find((s) => s.id === presentation?.songId),
    [songs, presentation?.songId]
  );
  const slides = song?.slides ?? [];
  const theme = useMemo(
    () => themes.find((t) => t.id === song?.defaultThemeId) || themes[0],
    [themes, song?.defaultThemeId]
  );
  const bgMap = useMemo(() => {
    const map: Record<string, Background> = {};
    for (const bg of backgrounds) map[bg.id] = bg;
    return map;
  }, [backgrounds]);

  const [idx, setIdx] = useState(presentation?.startIndex ?? 0);
  const [paused, setPaused] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [view, setView] = useState<PresentationView>(prefs.presentationView);
  const [showInfo, setShowInfo] = useState(prefs.showPresenterBar);
  const [elapsed, setElapsed] = useState(0);

  const tagGroups = useMemo(() => computeTagGroups(slides), [slides]);
  // Accumulates digit keys pressed while Ctrl is held; flushed on Ctrl keyup.
  const ctrlNumBuffer = useRef<string>("");

  const rootRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(rootRef);

  const cur = slides[idx];
  const next = slides[idx + 1];
  const style = theme ? resolveStyle(cur, song, theme) : undefined;
  const background = theme ? resolveBackground(cur, song, theme, bgMap) : undefined;
  const animation = theme ? resolveAnimation(cur, song, theme, prefs.transition) : prefs.transition;
  const audioId = resolveAudioId(cur, song, theme);
  const audioItem = audio.find((a) => a.id === audioId);
  const autoPlay = resolveAutoPlay(song, theme);
  const slideDuration = resolveSlideDuration(song, theme);

  const go = useCallback(
    (delta: number) => {
      setPaused((isPaused) => {
        if (!isPaused) setIdx((i) => Math.max(0, Math.min(slides.length - 1, i + delta)));
        return isPaused;
      });
    },
    [slides.length]
  );

  const goTo = useCallback(
    (target: number) => {
      setPaused((isPaused) => {
        if (!isPaused) setIdx(Math.max(0, Math.min(slides.length - 1, target)));
        return isPaused;
      });
    },
    [slides.length]
  );

  const exit = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen?.();
    stopPresent();
  }, [stopPresent]);

  const togglePause = useCallback(() => setPaused((p) => !p), []);
  const zoomIn = useCallback(() => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2))), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2))), []);
  const resetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);
  const panBy = useCallback((dx: number, dy: number) => {
    const limit = Math.max(window.innerWidth, window.innerHeight);
    setPan((p) => ({
      x: Math.max(-limit, Math.min(limit, p.x + dx)),
      y: Math.max(-limit, Math.min(limit, p.y + dy)),
    }));
  }, []);
  const setViewMode = useCallback((next: PresentationView) => setView(next), []);
  const cycleView = useCallback(
    () => setView((v) => VIEW_ORDER[(VIEW_ORDER.indexOf(v) + 1) % VIEW_ORDER.length]),
    []
  );
  const toggleInfo = useCallback(() => setShowInfo((s) => !s), []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key;

      // Tag navigation: Ctrl+digits accumulate into a buffer, flushed on Ctrl keyup.
      if (e.ctrlKey && /^[0-9]$/.test(key)) {
        e.preventDefault();
        ctrlNumBuffer.current += key;
        return;
      }
      // Ctrl+C: jump directly to the first Chorus slide.
      if (e.ctrlKey && key.toLowerCase() === "c") {
        e.preventDefault();
        ctrlNumBuffer.current = "";
        const chorusGroup = tagGroups.find((g) => g.type === "chorus");
        if (chorusGroup) goTo(chorusGroup.firstIndex);
        return;
      }

      if (["ArrowRight", " ", "PageDown", "l"].includes(key)) {
        e.preventDefault();
        go(1);
      } else if (["ArrowLeft", "PageUp", "h"].includes(key)) {
        e.preventDefault();
        go(-1);
      } else if (key === "Home") {
        goTo(0);
      } else if (key === "End") {
        goTo(slides.length - 1);
      } else if (key === "Escape") {
        exit();
      } else if (key === "p" || key === "P") {
        togglePause();
      } else if (key === "f" || key === "F") {
        toggleFullscreen();
      } else if (key === "i" || key === "I") {
        toggleInfo();
      } else if (key === "v" || key === "V") {
        cycleView();
      } else if (key === "+" || key === "=") {
        zoomIn();
      } else if (key === "-" || key === "_") {
        zoomOut();
      } else if (key === "0" && !e.ctrlKey) {
        resetZoom();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Control") {
        const buf = ctrlNumBuffer.current;
        ctrlNumBuffer.current = "";
        if (!buf) return;
        const num = parseInt(buf, 10);
        const group = tagGroups.find((g) => g.shortcutNum === num);
        if (group) goTo(group.firstIndex);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [
    go,
    goTo,
    exit,
    togglePause,
    toggleFullscreen,
    toggleInfo,
    cycleView,
    zoomIn,
    zoomOut,
    resetZoom,
    slides.length,
    tagGroups,
  ]);

  useEffect(() => {
    if (!autoPlay || paused || slides.length < 2) return;
    const timer = window.setInterval(() => {
      setIdx((i) => (i >= slides.length - 1 ? i : i + 1));
    }, slideDuration * 1000);
    return () => window.clearInterval(timer);
  }, [autoPlay, slideDuration, paused, slides.length, idx]);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [paused]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = Math.min(1, Math.max(0, prefs.backgroundVolume / 100));
  }, [prefs.backgroundVolume, audioItem?.id]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !audioItem) return;
    if (paused) el.pause();
    else void el.play().catch(() => {});
  }, [paused, audioItem?.id]);

  return {
    rootRef,
    audioRef,
    song,
    slides,
    tagGroups,
    theme,
    bgMap,
    idx,
    cur,
    next,
    style,
    background,
    animation,
    audioItem,
    paused,
    zoom,
    pan,
    view,
    showInfo,
    elapsed,
    isFullscreen,
    prefs,
    go,
    goTo,
    exit,
    togglePause,
    zoomIn,
    zoomOut,
    resetZoom,
    panBy,
    cycleView,
    setViewMode,
    toggleInfo,
    toggleFullscreen,
  };
}
