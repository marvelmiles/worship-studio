import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PresentationView, ScripturePassage } from "../../types";
import { slideIndexForVerse } from "../bible/lib/scriptureSlides";
import { useStore } from "../../store/useStore";
import { useFullscreen } from "../../hooks/useFullscreen";
import { useBgMap } from "../../hooks/useBgMap";
import { useMediaPlayback } from "../../hooks/useMediaPlayback";
import { audioSettingsOf, videoSettingsOf } from "../../lib/media";
import type { MediaPlayback } from "../../lib/presentChannel";
import { activatesOnSpace, targetOwnsKey } from "../../lib/mediaKeys";
import {
  resolveAudioId,
  resolveAutoPlay,
  resolveSlideDuration,
} from "../../lib/resolve";
import {
  computeTagGroups,
  FIXED_SHORTCUT_BY_LETTER,
} from "../../lib/tagGroups";
import { useDeck } from "./useDeck";
import { buildStageFrame } from "./stageContent";

const VIEW_ORDER: PresentationView[] = ["normal", "cover", "fill"];
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.1;
const VIDEO_SEEK_STEP = 5;

interface FullscreenOverride {
  isFullscreen: boolean;
  toggle: () => void;
}

export const usePresentation = (
  fullscreenOverride?: FullscreenOverride,
  shortcutGate?: () => boolean,
) => {
  const presentation = useStore((s) => s.presentation);
  const audio = useStore((s) => s.audio);
  const prefs = useStore((s) => s.prefs);
  const stopPresent = useStore((s) => s.stopPresent);
  const setPresentationIndex = useStore((s) => s.setPresentationIndex);

  const deck = useDeck(presentation?.kind, presentation?.id);
  const slides = useMemo(() => deck?.slides ?? [], [deck]);
  const bgMap = useBgMap();

  const [slideIndex, setSlideIndex] = useState(presentation?.startIndex ?? 0);
  const [paused, setPaused] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [view, setView] = useState<PresentationView>(prefs.presentationView);
  const [showInfo, setShowInfo] = useState(prefs.showPresenterBar);
  const [elapsed, setElapsed] = useState(0);

  const textSlides = useMemo(
    () => slides.flatMap((s) => (s.kind === "text" ? [s.slide] : [])),
    [slides],
  );
  const tagGroups = useMemo(() => computeTagGroups(textSlides), [textSlides]);
  const ctrlNumBuffer = useRef<string>("");

  const rootRef = useRef<HTMLDivElement>(null);
  const localFullscreen = useFullscreen(rootRef);
  const isFullscreen =
    fullscreenOverride?.isFullscreen ?? localFullscreen.isFullscreen;
  const toggleFullscreen = fullscreenOverride?.toggle ?? localFullscreen.toggle;

  const currentSlide = slides[slideIndex];
  const next = slides[slideIndex + 1];
  const frame = deck
    ? buildStageFrame(deck, currentSlide, bgMap, prefs.transition)
    : null;
  const nextFrame =
    deck && next ? buildStageFrame(deck, next, bgMap, prefs.transition) : null;

  const doc = deck?.doc;
  const theme = deck?.theme;
  const currentTextSlide =
    currentSlide?.kind === "text" ? currentSlide.slide : undefined;
  const isVideoSlide = currentSlide?.kind === "video";
  const currentVideoItem =
    currentSlide?.kind === "video" ? currentSlide.item : undefined;
  const videoSettings = currentVideoItem
    ? videoSettingsOf(currentVideoItem)
    : undefined;
  const video = useMediaPlayback(videoSettings);
  const {
    surfaceRef: videoRef,
    getTime: getVideoTime,
    playback: mediaPlayback,
    time: videoTime,
    duration: videoDuration,
    togglePlaying: toggleVideoPlaying,
    toggleMuted: toggleVideoMuted,
    setVolume: setVideoVolume,
    seekTo: seekVideoTo,
    seekBy: seekVideoBy,
    restart: restartVideo,
    onTimeUpdate: onVideoTime,
    onEnded: onVideoEnded,
  } = video;

  const audioId = doc ? resolveAudioId(currentTextSlide, doc, theme) : null;
  const audioItem = audio.find((a) => a.id === audioId);
  const autoPlay = doc ? resolveAutoPlay(doc, theme) : false;
  const slideDuration = resolveSlideDuration(doc, theme);

  const go = useCallback(
    (delta: number) => {
      setPaused((isPaused) => {
        if (!isPaused)
          setSlideIndex((i) =>
            Math.max(0, Math.min(slides.length - 1, i + delta)),
          );
        return isPaused;
      });
    },
    [slides.length],
  );

  const goTo = useCallback(
    (target: number) => {
      setPaused((isPaused) => {
        if (!isPaused)
          setSlideIndex(Math.max(0, Math.min(slides.length - 1, target)));
        return isPaused;
      });
    },
    [slides.length],
  );

  const exit = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen?.();
    stopPresent();
  }, [stopPresent]);

  const togglePause = useCallback(() => setPaused((p) => !p), []);
  const zoomIn = useCallback(
    () => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2))),
    [],
  );
  const zoomOut = useCallback(
    () => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2))),
    [],
  );
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
  const setViewMode = useCallback(
    (nextView: PresentationView) => setView(nextView),
    [],
  );
  const cycleView = useCallback(
    () =>
      setView(
        (v) => VIEW_ORDER[(VIEW_ORDER.indexOf(v) + 1) % VIEW_ORDER.length],
      ),
    [],
  );
  const toggleInfo = useCallback(() => setShowInfo((s) => !s), []);

  const togglePlayback = useCallback(() => {
    if (isVideoSlide) toggleVideoPlaying();
    else togglePause();
  }, [isVideoSlide, togglePause, toggleVideoPlaying]);

  const curVideoId = currentVideoItem?.id;
  const { reset: resetVideo } = video;
  useEffect(() => {
    if (!curVideoId) return;
    resetVideo();
  }, [curVideoId, resetVideo]);

  const shortcutGateRef = useRef(shortcutGate);
  shortcutGateRef.current = shortcutGate;

  const ownsKey = useCallback((e: KeyboardEvent): boolean => {
    if (targetOwnsKey(e)) return false;
    return shortcutGateRef.current?.() ?? true;
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!ownsKey(e)) return;
      const key = e.key;

      if (e.ctrlKey && /^[0-9]$/.test(key)) {
        e.preventDefault();
        ctrlNumBuffer.current += key;
        return;
      }
      const fixed = e.ctrlKey
        ? FIXED_SHORTCUT_BY_LETTER[key.toLowerCase()]
        : undefined;
      if (fixed) {
        e.preventDefault();
        ctrlNumBuffer.current = "";
        const group = tagGroups.find((g) => g.type === fixed.type);
        if (group) goTo(group.firstIndex);
        return;
      }

      if (key === " ") {
        if (activatesOnSpace(e.target)) return;
        e.preventDefault();
        togglePlayback();
      } else if (isVideoSlide && key === "ArrowRight") {
        e.preventDefault();
        seekVideoBy(VIDEO_SEEK_STEP);
      } else if (isVideoSlide && key === "ArrowLeft") {
        e.preventDefault();
        seekVideoBy(-VIDEO_SEEK_STEP);
      } else if (isVideoSlide && (key === "m" || key === "M")) {
        toggleVideoMuted();
      } else if (["ArrowRight", "PageDown", "l"].includes(key)) {
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
        togglePlayback();
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
      if (!ownsKey(e)) return;
      if (e.key === "Control") {
        const buf = ctrlNumBuffer.current;
        ctrlNumBuffer.current = "";
        if (!buf) return;
        const num = parseInt(buf, 10);
        if (doc && "verses" in doc) {
          const passage = doc as ScripturePassage;
          const index = slideIndexForVerse(passage, num);
          if (index >= 0) goTo(index);
        } else if (doc?.shortcutMode === "all-slides") {
          goTo(num - 1);
        } else {
          const group = tagGroups.find((g) => g.shortcutNum === num);
          if (group) goTo(group.firstIndex);
        }
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
    togglePlayback,
    toggleInfo,
    cycleView,
    zoomIn,
    zoomOut,
    resetZoom,
    slides.length,
    tagGroups,
    doc,
    isVideoSlide,
    toggleVideoMuted,
    seekVideoBy,
    ownsKey,
  ]);

  useEffect(() => {
    setPresentationIndex(slideIndex);
  }, [slideIndex, setPresentationIndex]);

  useEffect(() => {
    if (!autoPlay || paused || slides.length < 2) return;
    const timer = window.setInterval(() => {
      setSlideIndex((i) => (i >= slides.length - 1 ? i : i + 1));
    }, slideDuration * 1000);
    return () => window.clearInterval(timer);
  }, [autoPlay, slideDuration, paused, slides.length, slideIndex]);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(
      () => setElapsed((value) => value + 1),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [paused]);

  const playbackPaused = isVideoSlide ? !mediaPlayback.playing : paused;

  const audioSettings = useMemo(
    () => (audioItem ? audioSettingsOf(audioItem) : null),
    [audioItem],
  );
  const audioPlayback = useMemo<MediaPlayback | null>(
    () =>
      audioSettings
        ? {
            playing: !paused,
            muted: false,
            volume: (audioSettings.volume * prefs.backgroundVolume) / 100,
            seekTime: audioSettings.trimStart,
            seekToken: 0,
          }
        : null,
    [audioSettings, paused, prefs.backgroundVolume],
  );

  return {
    rootRef,
    videoRef,
    deck,
    doc,
    theme,
    slides,
    tagGroups,
    bgMap,
    slideIndex,
    currentSlide,
    next,
    frame,
    nextFrame,
    audioItem,
    audioPlayback,
    paused,
    playbackPaused,
    zoom,
    pan,
    view,
    showInfo,
    elapsed,
    isFullscreen,
    prefs,
    isVideoSlide,
    videoSettings,
    mediaPlayback,
    videoTime,
    videoDuration,
    getVideoTime,
    go,
    goTo,
    exit,
    togglePause,
    togglePlayback,
    zoomIn,
    zoomOut,
    resetZoom,
    panBy,
    cycleView,
    setViewMode,
    toggleInfo,
    toggleFullscreen,
    toggleVideoPlaying,
    toggleVideoMuted,
    setVideoVolume,
    seekVideoTo,
    seekVideoBy,
    restartVideo,
    onVideoTime,
    onVideoEnded,
  };
};
