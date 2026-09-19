import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { useStore } from "../../store/useStore";
import { useUITheme } from "../../theme/ThemeProvider";
import { useBgMap } from "../../hooks/useBgMap";
import { useProjectionFullscreen } from "../../hooks/useProjectionFullscreen";
import { useViewShortcuts } from "../../hooks/useViewShortcuts";
import { viewCommandTitle } from "../../lib/viewCommands";
import {
  MEDIA_SYNC_TOLERANCE_SECONDS,
  openPresentChannel,
  syncedPosition,
  type PresentState,
} from "../../lib/presentChannel";
import type { VideoSurfaceHandle } from "../../components/media/VideoSurface";
import { useOpenerLiveComposition } from "../stream/lib/useOpenerComposition";
import { useMirroredStreamOverlays } from "../stream/lib/streamOverlayStore";
import { useOverlayContentSync } from "../stream/lib/useOverlayContentSync";
import { useDeck } from "./useDeck";
import { buildStageFrame } from "./stageContent";
import { SecondaryPip } from "./SecondaryPip";
import { Stage } from "./Stage";
import { documentTitle } from "../../lib/appInfo";

export const PresentWindow = () => {
  const { stage } = useUITheme();
  const prefs = useStore((s) => s.prefs);
  const load = useStore((s) => s.load);

  const [state, setState] = useState<PresentState | null>(null);
  const { isFullscreen, toggle: toggleFullscreen } = useProjectionFullscreen();
  useViewShortcuts({ onToggleFullscreen: toggleFullscreen });
  const [hintVisible, setHintVisible] = useState(true);
  const hideTimer = useRef<number>();
  const lastReloadKey = useRef<string>("");
  const videoRef = useRef<VideoSurfaceHandle>(null);
  const secondaryVideoRef = useRef<VideoSurfaceHandle>(null);

  const secondary = state?.secondary;
  const composition = useOpenerLiveComposition(secondary?.kind === "stream");
  const streamOverlays = useMirroredStreamOverlays();
  useOverlayContentSync(streamOverlays);

  useEffect(() => {
    const channel = openPresentChannel((msg) => {
      if (msg.type === "state") {
        setState(msg.state);
        return;
      }
      if (msg.type !== "media-sync") return;
      const surface =
        msg.target === "secondary"
          ? secondaryVideoRef.current
          : videoRef.current;
      if (!surface) return;
      const expected = syncedPosition(msg.sync);
      if (
        Math.abs(surface.getCurrentTime() - expected) >
        MEDIA_SYNC_TOLERANCE_SECONDS
      )
        surface.seekTo(expected);
    });
    channel.postMessage({ type: "request-state" });
    return () => channel.close();
  }, []);

  useEffect(() => {
    document.title = documentTitle("Live");
    document.body.style.background = stage.surface;
    document.body.style.margin = "0";
  }, [stage.surface]);

  useEffect(() => {
    hideTimer.current = window.setTimeout(() => setHintVisible(false), 2500);
    return () => window.clearTimeout(hideTimer.current);
  }, []);

  const wake = () => {
    setHintVisible(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setHintVisible(false), 2500);
  };

  const claimFocus = () => {
    try {
      window.focus();
    } catch {}
  };

  const override = useMemo(
    () => ({ doc: state?.doc, item: state?.item }),
    [state?.doc, state?.item],
  );
  const deck = useDeck(state?.kind, state?.id, override);
  const bgMap = useBgMap();

  useEffect(() => {
    if (!state || state.doc) return;
    const stale = !deck || (!state.item && state.rev && deck.rev !== state.rev);
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

  const media = useStore((s) => s.media);
  const frame =
    deck && state
      ? buildStageFrame(
          deck,
          deck.slides[state.slideIndex],
          bgMap,
          prefs.transition,
          media,
        )
      : null;

  const fullscreenButton = (
    <button
      onClick={toggleFullscreen}
      title={viewCommandTitle(
        isFullscreen ? "Exit fullscreen" : "Fullscreen",
        "fullscreen",
      )}
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
      <div
        onPointerMove={wake}
        onPointerDown={claimFocus}
        style={{ position: "fixed", inset: 0, background: stage.surface }}
      >
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
        videoRef={videoRef}
      />
      {secondary && (
        <SecondaryPip
          secondary={secondary}
          stream={composition.primary}
          playback={secondary.media}
          videoRef={secondaryVideoRef}
          overlays={streamOverlays}
          cameras={composition.secondaries}
        />
      )}
      {fullscreenButton}
    </div>
  );
};
