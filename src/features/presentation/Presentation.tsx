import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useStore } from "../../store/useStore";
import { useGoLive } from "../../hooks/useGoLive";
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
  const p = usePresentation();
  const pushToast = useStore((s) => s.pushToast);
  const { isExtended, goLive } = useGoLive(p.rootRef);

  const [chromeActive, setChromeActive] = useState(true);
  const [live, setLive] = useState(false);
  const hideTimer = useRef<number>();
  const hovering = useRef(false);
  const announced = useRef(false);

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

  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) setLive(false);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  if (!p.song || !p.cur || !p.style || !p.background || !p.theme) return null;

  const { next, song, theme, bgMap } = p;
  const nextStyle = next ? resolveStyle(next, song, theme) : undefined;
  const nextLineStyles = next ? next.lines.map((_, i) => resolveLineStyle(next, i, song, theme)) : undefined;
  const nextBackground = next ? resolveBackground(next, song, theme, bgMap) : undefined;

  const controlsVisible = !p.prefs.autoHideControls || chromeActive;
  const presenterVisible = !p.prefs.autoHidePresenterBar || chromeActive;

  const handleGoLive = async () => {
    const result = await goLive();
    if (result.ok) {
      setLive(true);
      pushToast("Live on the external display.");
    } else if (result.reason === "no-external") {
      pushToast("No external display found — projecting on this screen.");
    } else if (result.reason === "unsupported") {
      pushToast("Live projection isn't supported here — using fullscreen instead.");
    }
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
        view={p.view}
        zoom={p.zoom}
        pan={p.pan}
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
        onExit={p.exit}
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
