import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useStore } from "../../store/useStore";
import { useGoLive } from "../../hooks/useGoLive";
import { openPresentChannel, type PresentState } from "../../lib/presentChannel";
import { resolveBackground, resolveLineStyle, resolveStyle } from "../../lib/resolve";
import { usePresentation } from "./usePresentation";
import { Stage } from "./Stage";
import { PresentationControls } from "./PresentationControls";
import { PresenterBar } from "./PresenterBar";
import type { Background } from "../../types";

function resolveStageBg(bg: Background): CSSProperties {
  if (bg?.type === "image") return { backgroundImage: `url(${bg.dataUrl})`, backgroundSize: "cover", backgroundPosition: "center" };
  if (bg?.type === "solid") return { background: bg.color };
  return { background: bg?.css || "#000" };
}

export function Presentation() {
  const pushToast = useStore((s) => s.pushToast);
  const { isExtended, isLive: live, isLiveFullscreen, goLive, endLive, toggleLiveFullscreen } = useGoLive();
  const handleToggleLiveFullscreen = () => {
    void toggleLiveFullscreen().then((ok) => {
      if (!ok) pushToast("Couldn't enter fullscreen remotely — click the fullscreen icon inside the projected window.");
    });
  };
  const fullscreenOverride = useMemo(
    () => (live ? { isFullscreen: isLiveFullscreen, toggle: handleToggleLiveFullscreen } : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [live, isLiveFullscreen, toggleLiveFullscreen]
  );
  const p = usePresentation(fullscreenOverride);

  const [chromeActive, setChromeActive] = useState(true);
  const hideTimer = useRef<number>();
  const hovering = useRef(false);
  const announced = useRef(false);
  const stateRef = useRef<PresentState | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const scheduleHide = () => {
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (!hovering.current) setChromeActive(false);
    }, 2800);
  };
  const wake = () => {
    setChromeActive(true);
    scheduleHide();
  };
  const onHoverChange = (isHovering: boolean) => {
    hovering.current = isHovering;
    if (isHovering) {
      setChromeActive(true);
      window.clearTimeout(hideTimer.current);
    } else {
      scheduleHide();
    }
  };

  useEffect(() => {
    wake();
    return () => window.clearTimeout(hideTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isExtended && !announced.current) {
      announced.current = true;
      pushToast("External display detected — tap Go Live to project.");
    }
  }, [isExtended, pushToast]);

  const songId = p.song?.id;
  useEffect(() => {
    if (!songId) return;
    stateRef.current = { songId, idx: p.idx, paused: p.paused, zoom: p.zoom, pan: p.pan, view: p.view };
    channelRef.current?.postMessage({ type: "state", state: stateRef.current });
  }, [songId, p.idx, p.paused, p.zoom, p.pan.x, p.pan.y, p.view]);

  useEffect(() => {
    if (!live) return;
    const channel = openPresentChannel((msg) => {
      if (msg.type === "request-state" && stateRef.current) {
        channel.postMessage({ type: "state", state: stateRef.current });
      }
    });
    channelRef.current = channel;
    if (stateRef.current) channel.postMessage({ type: "state", state: stateRef.current });
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [live]);

  if (!p.song || !p.cur || !p.style || !p.background || !p.theme) return null;

  const { next, song, theme, bgMap } = p;
  const nextStyle = next ? resolveStyle(next, song, theme) : undefined;
  const nextLineStyles = next ? next.lines.map((_, i) => resolveLineStyle(next, i, song, theme)) : undefined;
  const nextBackground = next ? resolveBackground(next, song, theme, bgMap) : undefined;

  const controlsVisible = !p.prefs.autoHideControls || chromeActive;
  const presenterVisible = !p.prefs.autoHidePresenterBar || chromeActive;

  // Once live, zoom/pan/view only shape what's broadcast to the external
  // popup — this window's own stage stays put so it can keep being used as
  // a console instead of mirroring the projected adjustments.
  const localZoom = live ? 1 : p.zoom;
  const localPan = live ? { x: 0, y: 0 } : p.pan;
  const localView = live ? "normal" : p.view;

  const handleGoLive = async () => {
    if (live) {
      endLive();
      pushToast("Ended the live projection.");
      return;
    }
    const result = await goLive();
    if (result.ok) {
      pushToast("Live on the external display.");
    } else if (result.reason === "no-external") {
      pushToast("No external display found — opened a presentation window, drag it to your projector.");
    } else if (result.reason === "unsupported") {
      pushToast("Multi-screen placement isn't supported here — opened a presentation window, drag it to your projector.");
    } else if (result.reason === "blocked") {
      pushToast("Popup blocked — allow popups for this site to go live.");
    } else if (result.reason === "error") {
      pushToast("Couldn't detect displays — opened a presentation window, drag it to your projector.");
    }
  };

  const handleExit = () => {
    endLive();
    p.exit();
  };

  return (
    <div
      ref={p.rootRef}
      onPointerMove={wake}
      onPointerLeave={() => {
        window.clearTimeout(hideTimer.current);
        if (!hovering.current) setChromeActive(false);
      }}
      style={{ position: "fixed", inset: 0, zIndex: 150, ...resolveStageBg(p.background) }}
    >
      <Stage
        idx={p.idx}
        slide={p.cur}
        style={p.style}
        lineStyles={p.lineStyles}
        background={p.background}
        animation={p.animation}
        view={localView}
        zoom={localZoom}
        pan={localPan}
        onPanBy={p.panBy}
        durationMs={p.prefs.transitionDuration}
        easing={p.prefs.easing}
      />

      <PresentationControls
        paused={p.paused}
        view={p.view}
        zoom={p.zoom}
        showInfo={p.showInfo}
        isFullscreen={p.isFullscreen}
        visible={controlsVisible}
        isExternal={isExtended}
        isLive={live}
        onHoverChange={onHoverChange}
        onGoLive={handleGoLive}
        onTogglePause={p.togglePause}
        onSetView={p.setViewMode}
        onZoomIn={p.zoomIn}
        onZoomOut={p.zoomOut}
        onResetZoom={p.resetZoom}
        onToggleInfo={p.toggleInfo}
        onToggleFullscreen={p.toggleFullscreen}
        onExit={handleExit}
      />

      {p.showInfo && (
        <PresenterBar
          song={p.song}
          cur={p.cur}
          next={p.next}
          nextStyle={nextStyle}
          nextLineStyles={nextLineStyles}
          nextBackground={nextBackground}
          idx={p.idx}
          total={p.slides.length}
          elapsed={p.elapsed}
          paused={p.paused}
          visible={presenterVisible}
          onHoverChange={onHoverChange}
          onPrev={() => p.go(-1)}
          onNext={() => p.go(1)}
        />
      )}

      {p.audioItem && <audio ref={p.audioRef} src={p.audioItem.dataUrl} loop={p.prefs.loopAudio} />}
    </div>
  );
}
