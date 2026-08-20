import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { useStore } from "../../store/useStore";
import { useUITheme } from "../../theme/ThemeProvider";
import { useBgMap } from "../../hooks/useBgMap";
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
  const videoRef = useRef<VideoSurfaceHandle>(null);
  const secondaryVideoRef = useRef<VideoSurfaceHandle>(null);

  const secondary = state?.secondary;
  // A MediaStream cannot travel the broadcast channel, so a corner window
  // showing the live camera reads it by reference from the window that opened
  // this one. Only then: nothing else here needs the opener at all.
  const composition = useOpenerLiveComposition(secondary?.kind === "stream");
  // The overlays are plain data, so they reach this window the same way they
  // reach the stream module's own projector: over a channel, live. That is what
  // makes a passage put on air from the Stream page appear over the camera in
  // this presentation's corner window without anything being pushed twice.
  const streamOverlays = useMirroredStreamOverlays();
  useOverlayContentSync(streamOverlays);

  useEffect(() => {
    const channel = openPresentChannel((msg) => {
      if (msg.type === "state") {
        setState(msg.state);
        return;
      }
      // The operator's playhead, carried forward by the time the message spent
      // in flight. This window runs its own video element, so it is left to
      // play on its own and only pulled back when it has actually drifted:
      // seeking on every reading would stutter the picture instead.
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

  // Held steady between broadcasts so the deck is only rebuilt when the
  // operator actually sends a new version.
  const override = useMemo(
    () => ({ doc: state?.doc, item: state?.item }),
    [state?.doc, state?.item],
  );
  const deck = useDeck(state?.kind, state?.id, override);
  const bgMap = useBgMap();

  // This window loads its store once on open; content created or edited after
  // that would be missing here, so reload from storage when the operator's
  // broadcast references something newer than our copy. A deck or a media item
  // that arrived whole in the broadcast is never stale. The key resets after a
  // moment so a reload that raced the operator's write gets retried.
  useEffect(() => {
    if (!state || state.doc) return;
    // A media item arrives whole too, but the library around it (the rest of
    // the image slideshow) still has to be there, so a deck that could not be
    // built at all is always worth another read.
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

  const frame =
    deck && state
      ? buildStageFrame(
          deck,
          deck.slides[state.slideIndex],
          bgMap,
          prefs.transition,
        )
      : null;

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
}
